import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm'
import type { Bindings, Variables } from '../types'
import { schema } from '@crms/db'
import { ok, err } from '../lib/response'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { UserRole } from '@crms/types'
import { generateId } from '../lib/id'
import { calculateBusinessDays } from '../lib/business-days'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const reportQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  departmentId: z.string().optional(),
  vendorId: z.string().optional(),
  year: z.string().optional(),
  quarter: z.string().optional(),
  month: z.string().optional(),
})

// Get comprehensive report data
app.get('/', authMiddleware, requireRole(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.BUSINESS_ANALYST), zValidator('query', reportQuerySchema), async (c) => {
  const { startDate, endDate, departmentId, vendorId, year, quarter, month } = c.req.valid('query')
  const db = c.get('db')

  // Build date filter
  let dateConditions: any[] = []
  
  if (startDate && endDate) {
    // Custom date range
    dateConditions.push(gte(schema.workItems.createdAt, new Date(startDate)))
    dateConditions.push(lte(schema.workItems.createdAt, new Date(endDate)))
  } else if (year && quarter) {
    // Quarterly filter
    const y = parseInt(year)
    const q = parseInt(quarter)
    const startMonth = (q - 1) * 3
    const endMonth = startMonth + 2
    dateConditions.push(gte(schema.workItems.createdAt, new Date(y, startMonth, 1)))
    dateConditions.push(lte(schema.workItems.createdAt, new Date(y, endMonth + 1, 0, 23, 59, 59)))
  } else if (year && month) {
    // Monthly filter
    const y = parseInt(year)
    const m = parseInt(month) - 1
    dateConditions.push(gte(schema.workItems.createdAt, new Date(y, m, 1)))
    dateConditions.push(lte(schema.workItems.createdAt, new Date(y, m + 1, 0, 23, 59, 59)))
  } else if (year) {
    // Yearly filter
    const y = parseInt(year)
    dateConditions.push(gte(schema.workItems.createdAt, new Date(y, 0, 1)))
    dateConditions.push(lte(schema.workItems.createdAt, new Date(y, 11, 31, 23, 59, 59)))
  }

  // Department filter
  if (departmentId) {
    dateConditions.push(eq(schema.workItems.departmentId, departmentId))
  }

  // Vendor/Platform filter
  if (vendorId) {
    dateConditions.push(eq(schema.workItems.vendorId, vendorId))
  }

  const where = dateConditions.length > 0 ? and(...dateConditions) : undefined

  // Get all work items in date range
  const items = await db.query.workItems.findMany({
    where,
    with: {
      department: true,
      vendor: true,
      manager: true,
      developer: true,
    },
  })

  // Calculate statistics
  const totalRequests = items.length
  const byStatus = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const byPriority = items.reduce((acc, item) => {
    acc[item.priority] = (acc[item.priority] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const byDepartment = items.reduce((acc, item) => {
    const deptName = item.department?.name || 'Unknown'
    acc[deptName] = (acc[deptName] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const byVendor = items.reduce((acc, item) => {
    const vendorName = item.vendor?.name || 'Unknown'
    acc[vendorName] = (acc[vendorName] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Calculate average cycle time for completed items
  const completedItems = items.filter(i => i.goLiveDate)
  const avgCycleTime = completedItems.length > 0
    ? completedItems.reduce((acc, item) => {
        const days = Math.floor((new Date(item.goLiveDate!).getTime() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        return acc + days
      }, 0) / completedItems.length
    : 0

  // Monthly trend (last 12 months from filter date or now)
  const endDateObj = endDate ? new Date(endDate) : new Date()
  const monthlyTrend: { month: string; count: number; completed: number }[] = []
  
  for (let i = 11; i >= 0; i--) {
    const d = new Date(endDateObj)
    d.setMonth(d.getMonth() - i)
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    
    const monthItems = items.filter(item => {
      const created = new Date(item.createdAt)
      return created >= monthStart && created <= monthEnd
    })
    
    const monthCompleted = monthItems.filter(i => i.status === 'go_live').length
    
    monthlyTrend.push({
      month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      count: monthItems.length,
      completed: monthCompleted,
    })
  }

  // Developer performance
  const developerStats = items
    .filter(i => i.developer)
    .reduce((acc, item) => {
      const devName = item.developer!.name
      if (!acc[devName]) {
        acc[devName] = { total: 0, completed: 0, inProgress: 0 }
      }
      acc[devName].total++
      if (item.status === 'go_live') acc[devName].completed++
      if (['development', 'uat', 'deployment'].includes(item.status)) acc[devName].inProgress++
      return acc
    }, {} as Record<string, { total: number; completed: number; inProgress: number }>)

  // Priority distribution with trend
  const priorityTrend = Object.entries(byPriority).map(([priority, count]) => ({
    priority,
    count,
    percentage: ((count / totalRequests) * 100).toFixed(1),
  }))

  // SLA compliance (assuming 30 days for high priority, 60 for others)
  const slaCompliance = completedItems.map(item => {
    const cycleTime = Math.floor((new Date(item.goLiveDate!).getTime() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    const slaTarget = item.priority === 'critical' ? 15 : item.priority === 'high' ? 30 : 60
    return {
      met: cycleTime <= slaTarget,
      cycleTime,
      slaTarget,
    }
  })

  const slaMetCount = slaCompliance.filter(s => s.met).length
  const slaMetPercentage = completedItems.length > 0 ? (slaMetCount / completedItems.length) * 100 : 0

  return c.json(ok({
    summary: {
      totalRequests,
      completedRequests: completedItems.length,
      avgCycleTimeDays: Math.round(avgCycleTime),
      slaCompliance: Math.round(slaMetPercentage),
    },
    byStatus,
    byPriority,
    byDepartment,
    byVendor,
    monthlyTrend,
    developerStats,
    priorityTrend,
    slaCompliance: {
      met: slaMetCount,
      total: completedItems.length,
      percentage: Math.round(slaMetPercentage),
    },
  }))
})

// Project Health - Detailed project health metrics
app.get('/project-health', authMiddleware, requireRole(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.BUSINESS_ANALYST), zValidator('query', reportQuerySchema), async (c) => {
  const { startDate, endDate, departmentId, vendorId, year, quarter, month } = c.req.valid('query')
  const db = c.get('db')

  // Build date filter - FLEXIBLE untuk menampilkan project aktif + project dalam periode
  let periodStart: Date | null = null
  let periodEnd: Date | null = null
  
  if (startDate && endDate) {
    periodStart = new Date(startDate)
    periodEnd = new Date(endDate)
  } else if (year && quarter) {
    const y = parseInt(year)
    const q = parseInt(quarter)
    const startMonth = (q - 1) * 3
    const endMonth = startMonth + 2
    periodStart = new Date(y, startMonth, 1)
    periodEnd = new Date(y, endMonth + 1, 0, 23, 59, 59)
  } else if (year && month) {
    const y = parseInt(year)
    const m = parseInt(month) - 1
    periodStart = new Date(y, m, 1)
    periodEnd = new Date(y, m + 1, 0, 23, 59, 59)
  } else if (year) {
    const y = parseInt(year)
    periodStart = new Date(y, 0, 1)
    periodEnd = new Date(y, 11, 31, 23, 59, 59)
  }

  // Get ALL work items - kita akan filter di memory untuk fleksibilitas
  let queryConditions: any[] = []
  if (departmentId) queryConditions.push(eq(schema.workItems.departmentId, departmentId))
  if (vendorId) queryConditions.push(eq(schema.workItems.vendorId, vendorId))

  const where = queryConditions.length > 0 ? and(...queryConditions) : undefined

  // Get all work items with relations
  const allItems = await db.query.workItems.findMany({
    where,
    with: {
      department: true,
      vendor: true,
      manager: true,
      developer: true,
      qa: true,
      businessAnalyst: true,
      assessment: true,
      tasks: { with: { subtasks: true } },
    },
  })

  // Filter items berdasarkan periode yang dipilih
  const items = allItems.filter(item => {
    const createdAt = new Date(item.createdAt)
    const completedAt = item.goLiveDate ? new Date(item.goLiveDate) : null
    const isDropped = item.status === 'drop'

    // Jika tidak ada filter periode, tampilkan semua kecuali drop
    if (!periodStart || !periodEnd) {
      return !isDropped
    }

    // Jangan tampilkan yang di-drop
    if (isDropped) return false

    // Tampilkan project yang aktif/berjalan dalam periode ini:
    // 1. Dibuat sebelum/selama periode berakhir
    // 2. DAN (belum selesai ATAU selesai dalam/setelah periode mulai)
    const createdBeforePeriodEnd = createdAt <= periodEnd
    const notCompletedBeforePeriod = !completedAt || completedAt >= periodStart

    return createdBeforePeriodEnd && notCompletedBeforePeriod
  })

  const activeProjects = items.filter(i => !['go_live', 'drop', 'in_pipeline'].includes(i.status))

  // Calculate health metrics for each project
  const projectsWithHealth = activeProjects.map(project => {
    const assessment = project.assessment
    const now = new Date()
    const created = new Date(project.createdAt)
    const dueDate = project.dueDate ? new Date(project.dueDate) : null
    const targetGoLive = assessment?.targetGoLive ? new Date(assessment.targetGoLive) : dueDate
    
    // Time metrics
    const daysElapsed = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    const isOverdue = dueDate && now > dueDate && project.status !== 'go_live'
    const daysUntilDue = dueDate ? Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
    
    // Progress calculation
    let progress = 0
    if (project.status === 'assessment') progress = 20
    else if (project.status === 'development') progress = 50
    else if (project.status === 'uat') progress = 75
    else if (project.status === 'deployment') progress = 90
    
    // Risk assessment
    const hasHighRisk = assessment?.risk && ['high', 'critical'].includes(assessment.risk)
    const hasHighImpact = assessment?.impact && ['high', 'critical'].includes(assessment.impact)
    const isHighPriority = ['high', 'critical'].includes(project.priority)
    const hasComplexity = assessment?.complexity === 'high'
    
    // Health score calculation (0-100)
    let healthScore = 100
    if (isOverdue) healthScore -= 30
    if (hasHighRisk) healthScore -= 20
    if (hasHighImpact) healthScore -= 10
    if (daysUntilDue !== null && daysUntilDue < 7 && progress < 80) healthScore -= 15
    if (hasComplexity && progress < 30) healthScore -= 10
    if (!project.developer) healthScore -= 15
    
    // Health status
    let healthStatus: 'excellent' | 'good' | 'at-risk' | 'critical' = 'excellent'
    if (healthScore >= 80) healthStatus = 'excellent'
    else if (healthScore >= 60) healthStatus = 'good'
    else if (healthScore >= 40) healthStatus = 'at-risk'
    else healthStatus = 'critical'
    
    // Task statistics
    const allTasks = project.tasks || []
    const completedTasks = allTasks.filter(t => t.status === 'done').length
    const taskProgress = allTasks.length > 0 ? (completedTasks / allTasks.length) * 100 : 0
    
    // Team completeness
    const teamMembers = [
      project.manager,
      project.businessAnalyst,
      project.developer,
      project.qa,
    ].filter(Boolean)
    const teamCompleteness = (teamMembers.length / 4) * 100
    
    return {
      id: project.id,
      ticketNumber: project.ticketNumber,
      title: project.title,
      status: project.status,
      priority: project.priority,
      department: project.department?.name,
      vendor: project.vendor?.name,
      progress,
      healthScore,
      healthStatus,
      
      // Time metrics
      daysElapsed,
      daysUntilDue,
      isOverdue: !!isOverdue,
      createdAt: project.createdAt,
      dueDate: project.dueDate,
      targetGoLive,
      
      // Assessment data
      estimatedManDays: assessment?.estimatedManDays,
      estimatedHours: assessment?.estimatedHours,
      complexity: assessment?.complexity,
      risk: assessment?.risk,
      impact: assessment?.impact,
      
      // Task metrics
      totalTasks: allTasks.length,
      completedTasks,
      taskProgress: Math.round(taskProgress),
      
      // Team
      manager: project.manager?.name,
      developer: project.developer?.name,
      qa: project.qa?.name,
      businessAnalyst: project.businessAnalyst?.name,
      teamCompleteness: Math.round(teamCompleteness),
      
      // Flags
      isHighPriority,
      hasHighRisk,
      hasHighImpact,
      hasComplexity,
    }
  })

  // Summary statistics
  const totalProjects = projectsWithHealth.length
  const excellentCount = projectsWithHealth.filter(p => p.healthStatus === 'excellent').length
  const goodCount = projectsWithHealth.filter(p => p.healthStatus === 'good').length
  const atRiskCount = projectsWithHealth.filter(p => p.healthStatus === 'at-risk').length
  const criticalCount = projectsWithHealth.filter(p => p.healthStatus === 'critical').length
  const overdueCount = projectsWithHealth.filter(p => p.isOverdue).length
  
  const avgHealthScore = totalProjects > 0
    ? Math.round(projectsWithHealth.reduce((sum, p) => sum + p.healthScore, 0) / totalProjects)
    : 0
  
  const avgProgress = totalProjects > 0
    ? Math.round(projectsWithHealth.reduce((sum, p) => sum + p.progress, 0) / totalProjects)
    : 0

  // Health distribution over time - 6 bulan berdasarkan periode yang dipilih (atau 6 bulan terakhir)
  const healthTrend: any[] = []
  const trendEndDate = periodEnd ?? new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(trendEndDate)
    d.setMonth(d.getMonth() - i)
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    
    // Ambil dari allItems (semua, tidak hanya yang difilter period) untuk trend yang lebih akurat
    const monthProjects = allItems.filter(p => {
      if (p.status === 'drop') return false
      const created = new Date(p.createdAt)
      return created >= monthStart && created <= monthEnd
    })
    
    healthTrend.push({
      month: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      excellent: monthProjects.filter(p => {
        const score = p.assessment?.risk === 'high' ? 50 : 90
        return score >= 80
      }).length,
      good: monthProjects.length,
      atRisk: monthProjects.filter(p => p.priority === 'high' || p.priority === 'critical').length,
      critical: monthProjects.filter(p => {
        if (!p.dueDate) return false
        return new Date(p.dueDate) < new Date() && !['go_live', 'drop'].includes(p.status)
      }).length,
    })
  }

  // Risk matrix (Risk vs Impact)
  const riskMatrix = projectsWithHealth
    .filter(p => p.risk && p.impact)
    .map(p => ({
      ticketNumber: p.ticketNumber,
      title: p.title,
      risk: p.risk,
      impact: p.impact,
      priority: p.priority,
    }))

  // Complexity distribution
  const complexityDistribution = {
    low: projectsWithHealth.filter(p => p.complexity === 'low').length,
    medium: projectsWithHealth.filter(p => p.complexity === 'medium').length,
    high: projectsWithHealth.filter(p => p.complexity === 'high').length,
  }

  // Projects by health status grouped
  const projectsByHealth = {
    excellent: projectsWithHealth.filter(p => p.healthStatus === 'excellent').slice(0, 10),
    good: projectsWithHealth.filter(p => p.healthStatus === 'good').slice(0, 10),
    atRisk: projectsWithHealth.filter(p => p.healthStatus === 'at-risk'),
    critical: projectsWithHealth.filter(p => p.healthStatus === 'critical'),
  }

  return c.json(ok({
    summary: {
      totalProjects,
      excellentCount,
      goodCount,
      atRiskCount,
      criticalCount,
      overdueCount,
      avgHealthScore,
      avgProgress,
    },
    projects: projectsWithHealth,
    healthTrend,
    riskMatrix,
    complexityDistribution,
    projectsByHealth,
  }))
})

// Executive Overview - Comprehensive dashboard metrics
app.get('/executive-overview', authMiddleware, requireRole(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.BUSINESS_ANALYST), zValidator('query', reportQuerySchema), async (c) => {
  const { startDate, endDate, departmentId, vendorId, year, quarter, month } = c.req.valid('query')
  const db = c.get('db')

  // Build date filter - FLEXIBLE untuk menampilkan project aktif + project dalam periode
  let dateConditions: any[] = []
  let periodStart: Date | null = null
  let periodEnd: Date | null = null
  
  if (startDate && endDate) {
    periodStart = new Date(startDate)
    periodEnd = new Date(endDate)
  } else if (year && quarter) {
    const y = parseInt(year)
    const q = parseInt(quarter)
    const startMonth = (q - 1) * 3
    const endMonth = startMonth + 2
    periodStart = new Date(y, startMonth, 1)
    periodEnd = new Date(y, endMonth + 1, 0, 23, 59, 59)
  } else if (year && month) {
    const y = parseInt(year)
    const m = parseInt(month) - 1
    periodStart = new Date(y, m, 1)
    periodEnd = new Date(y, m + 1, 0, 23, 59, 59)
  } else if (year) {
    const y = parseInt(year)
    periodStart = new Date(y, 0, 1)
    periodEnd = new Date(y, 11, 31, 23, 59, 59)
  }

  // Get ALL work items - kita akan filter di memory untuk fleksibilitas
  let queryConditions: any[] = []
  if (departmentId) queryConditions.push(eq(schema.workItems.departmentId, departmentId))
  if (vendorId) queryConditions.push(eq(schema.workItems.vendorId, vendorId))

  const where = queryConditions.length > 0 ? and(...queryConditions) : undefined

  // Get all work items with relations
  const allItems = await db.query.workItems.findMany({
    where,
    with: {
      department: true,
      vendor: true,
      manager: true,
      developer: true,
      qa: true,
      businessAnalyst: true,
      assessment: true,
      activityLogs: { with: { user: { columns: { id: true, name: true } } }, orderBy: [desc(schema.activityLogs.createdAt)], limit: 10 },
    },
  })

  // Filter items: include active projects OR projects in selected period
  const items = allItems.filter(item => {
    // Selalu tampilkan project yang masih aktif (belum selesai)
    const isActive = !['go_live', 'drop'].includes(item.status)
    if (isActive) return true

    // Untuk project yang sudah selesai, cek apakah dalam periode
    if (periodStart && periodEnd) {
      const createdAt = new Date(item.createdAt)
      const completedAt = item.goLiveDate ? new Date(item.goLiveDate) : null
      
      // Include jika dibuat atau selesai dalam periode
      return (createdAt >= periodStart && createdAt <= periodEnd) ||
             (completedAt && completedAt >= periodStart && completedAt <= periodEnd)
    }

    // Jika tidak ada filter periode, tampilkan semua
    return true
  })

  const totalRequests = items.length
  const activeProjects = items.filter(i => !['go_live', 'drop', 'in_pipeline'].includes(i.status)).length
  const completedItems = items.filter(i => i.status === 'go_live')
  const delayedItems = items.filter(i => {
    if (!i.dueDate || ['go_live', 'drop'].includes(i.status)) return false
    return new Date(i.dueDate) < new Date()
  })

  // Calculate metrics with proper handling (business days only)
  const avgCycleTime = completedItems.length > 0
    ? completedItems.reduce((acc, item) => {
        if (!item.goLiveDate) return acc
        const businessDays = calculateBusinessDays(new Date(item.createdAt), new Date(item.goLiveDate))
        return acc + Math.max(0, businessDays) // Ensure non-negative
      }, 0) / completedItems.length
    : 0

  // SLA Achievement (business days)
  const slaItems = completedItems.map(item => {
    const cycleTime = calculateBusinessDays(new Date(item.createdAt), new Date(item.goLiveDate!))
    const slaTarget = item.priority === 'critical' ? 15 : item.priority === 'high' ? 30 : 60
    return cycleTime <= slaTarget
  })
  const slaAchievement = completedItems.length > 0 ? (slaItems.filter(Boolean).length / completedItems.length) * 100 : 0

  // Status breakdown with percentages
  const statusBreakdown = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const requestsByStatus = Object.entries(statusBreakdown).map(([status, count]) => ({
    status,
    count,
    percentage: totalRequests > 0 ? ((count / totalRequests) * 100).toFixed(1) : '0',
  }))

  // Priority breakdown
  const priorityBreakdown = items.reduce((acc, item) => {
    acc[item.priority] = (acc[item.priority] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const requestsByPriority = Object.entries(priorityBreakdown).map(([priority, count]) => ({
    priority,
    count,
    percentage: totalRequests > 0 ? ((count / totalRequests) * 100).toFixed(1) : '0',
  }))

  // Monthly trend for last 6 months
  const endDateObj = endDate ? new Date(endDate) : new Date()
  const monthlyTrend: { month: string; created: number; completed: number }[] = []
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date(endDateObj)
    d.setMonth(d.getMonth() - i)
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    
    const monthItems = items.filter(item => {
      const created = new Date(item.createdAt)
      return created >= monthStart && created <= monthEnd
    })
    
    const monthCompleted = monthItems.filter(i => i.goLiveDate && 
      new Date(i.goLiveDate) >= monthStart && new Date(i.goLiveDate) <= monthEnd
    ).length
    
    monthlyTrend.push({
      month: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      created: monthItems.length,
      completed: monthCompleted,
    })
  }

  // Top 5 projects by progress
  const projectProgress = items
    .filter(i => !['go_live', 'drop', 'in_pipeline'].includes(i.status))
    .map(item => {
      let progress = 0
      if (item.status === 'assessment') progress = 20
      else if (item.status === 'development') progress = 40
      else if (item.status === 'uat') progress = 70
      else if (item.status === 'deployment') progress = 90
      
      return {
        name: item.title,
        ticketNumber: item.ticketNumber,
        progress,
        status: item.status,
      }
    })
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 5)

  // Timeline/Roadmap overview - ongoing projects with timeline
  const timelineProjects = items
    .filter(i => !['go_live', 'drop', 'in_pipeline'].includes(i.status))
    .slice(0, 5)
    .map(item => {
      const created = new Date(item.createdAt)
      const due = item.dueDate ? new Date(item.dueDate) : null
      const assessment = item.assessment
      
      return {
        id: item.id,
        name: item.title,
        ticketNumber: item.ticketNumber,
        startDate: created,
        endDate: assessment?.targetGoLive ? new Date(assessment.targetGoLive) : due,
        status: item.status,
        isAtRisk: due && new Date() > due && !['go_live'].includes(item.status),
        isDelayed: delayedItems.some(d => d.id === item.id),
        milestone: item.status === 'deployment' ? 'Near completion' : null,
      }
    })

  // SLA breakdown
  const slaBreakdown = {
    withinSLA: slaItems.filter(Boolean).length,
    overSLA: slaItems.filter(s => !s).length,
    percentage: Math.round(slaAchievement),
  }

  // Workload by assignee (Top 5)
  const workloadMap = new Map<string, { name: string; assigned: number; completed: number; remaining: number; utilization: number }>()
  
  items.forEach(item => {
    const devId = item.developer?.id
    const devName = item.developer?.name
    if (devId && devName) {
      if (!workloadMap.has(devId)) {
        workloadMap.set(devId, { name: devName, assigned: 0, completed: 0, remaining: 0, utilization: 0 })
      }
      const entry = workloadMap.get(devId)!
      entry.assigned++
      if (item.status === 'go_live') entry.completed++
      else entry.remaining++
    }
  })

  const workloadByAssignee = Array.from(workloadMap.values())
    .map(w => ({
      ...w,
      utilization: w.assigned > 0 ? Math.round((w.remaining / w.assigned) * 100) : 0,
    }))
    .sort((a, b) => b.assigned - a.assigned)
    .slice(0, 5)

  // Average cycle time by stage (business days)
  const stageMap = new Map<string, number[]>()
  
  completedItems.forEach(item => {
    const logs = item.activityLogs || []
    const stages = ['assessment', 'development', 'uat', 'deployment']
    
    stages.forEach(stage => {
      const stageStart = logs.find(log => log.description?.includes(`Status changed`) && log.description?.includes(stage))
      const nextStageIndex = stages.indexOf(stage) + 1
      const nextStage = stages[nextStageIndex]
      const stageEnd = nextStage 
        ? logs.find(log => log.description?.includes(`Status changed`) && log.description?.includes(nextStage))
        : logs.find(log => log.description?.includes(`Status changed`) && log.description?.includes('go_live'))
      
      if (stageStart && stageEnd) {
        const businessDays = calculateBusinessDays(new Date(stageStart.createdAt), new Date(stageEnd.createdAt))
        if (!stageMap.has(stage)) stageMap.set(stage, [])
        stageMap.get(stage)!.push(businessDays)
      }
    })
  })

  const avgCycleTimeByStage = Array.from(stageMap.entries()).map(([stage, days]) => ({
    stage,
    avgDays: days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : 0,
  }))

  // Recent activity (last 10)
  const recentActivity = items
    .flatMap(item => 
      (item.activityLogs || []).map(log => ({
        ticketNumber: item.ticketNumber,
        action: log.action,
        description: log.description,
        createdAt: log.createdAt,
        userName: log.user?.name || log.guestName || 'System',
      }))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)

  // Projects health summary
  const projectsHealth = items
    .filter(i => !['go_live', 'drop', 'in_pipeline'].includes(i.status))
    .map(item => {
      const isDelayed = delayedItems.some(d => d.id === item.id)
      const isHighPriority = ['high', 'critical'].includes(item.priority)
      const assessment = item.assessment
      const hasRisk = assessment?.risk && ['high', 'critical'].includes(assessment.risk)
      
      let health: 'good' | 'at-risk' | 'critical' = 'good'
      if ((isDelayed && isHighPriority) || hasRisk) health = 'critical'
      else if (isDelayed || isHighPriority) health = 'at-risk'
      
      const now = new Date()
      const created = new Date(item.createdAt)
      const due = item.dueDate ? new Date(item.dueDate) : null
      
      let statusProgress = 0
      if (item.status === 'assessment') statusProgress = 25
      else if (item.status === 'development') statusProgress = 50
      else if (item.status === 'uat') statusProgress = 75
      else if (item.status === 'deployment') statusProgress = 90
      
      const cycleTimeDays = calculateBusinessDays(created, now)
      const slaTarget = item.priority === 'critical' ? 15 : item.priority === 'high' ? 30 : 60
      
      const issuesInProgress = item.status === 'development' || item.status === 'uat' ? 1 : 0
      const issuesDone = item.status === 'go_live' ? 1 : 0
      
      return {
        name: item.title,
        ticketNumber: item.ticketNumber,
        progress: statusProgress,
        status: item.status,
        health,
        priority: item.priority,
        openIssues: 0,
        inProgressIssues: issuesInProgress,
        doneIssues: issuesDone,
        avgCycleTime: cycleTimeDays,
        sla: cycleTimeDays <= slaTarget ? 'on-time' : 'overdue',
      }
    })

  // Mandays per vendor - fetch all topups for the period too
  let topupConditions: any[] = []
  if (periodStart && periodEnd) {
    topupConditions.push(gte(schema.mandaysTopups.createdAt, periodStart))
    topupConditions.push(lte(schema.mandaysTopups.createdAt, periodEnd))
  }
  if (vendorId) topupConditions.push(eq(schema.mandaysTopups.vendorId, vendorId))
  const topupWhere = topupConditions.length > 0 ? and(...topupConditions) : undefined

  const allTopups = await db.query.mandaysTopups.findMany({
    where: topupWhere,
    with: { vendor: true },
  })

  // Build vendor mandays map from ALL items (not period-filtered) for balance accuracy
  const vendorMandaysMap = new Map<string, {
    vendorId: string
    vendorName: string
    planned: number
    used: number
    topup: number
    total: number
    remaining: number
    utilizationPercent: number
    projectCount: number
  }>()

  allItems.forEach(item => {
    if (!item.vendor) return
    const vId = item.vendor.id
    const vName = item.vendor.name
    if (!vendorMandaysMap.has(vId)) {
      vendorMandaysMap.set(vId, { vendorId: vId, vendorName: vName, planned: 0, used: 0, topup: 0, total: 0, remaining: 0, utilizationPercent: 0, projectCount: 0 })
    }
    const entry = vendorMandaysMap.get(vId)!
    entry.projectCount++
    if (item.assessment?.estimatedManDays) entry.planned += item.assessment.estimatedManDays
    if (item.mandays) entry.used += item.mandays
  })

  allTopups.forEach(t => {
    const vId = t.vendorId
    const vName = t.vendor.name
    if (!vendorMandaysMap.has(vId)) {
      vendorMandaysMap.set(vId, { vendorId: vId, vendorName: vName, planned: 0, used: 0, topup: 0, total: 0, remaining: 0, utilizationPercent: 0, projectCount: 0 })
    }
    vendorMandaysMap.get(vId)!.topup += t.mandays
  })

  const mandaysPerVendor = Array.from(vendorMandaysMap.values()).map(v => {
    v.total = Math.round((v.planned + v.topup) * 10) / 10
    v.remaining = Math.round((v.total - v.used) * 10) / 10
    v.used = Math.round(v.used * 10) / 10
    v.planned = Math.round(v.planned * 10) / 10
    v.topup = Math.round(v.topup * 10) / 10
    v.utilizationPercent = v.total > 0 ? Math.round((v.used / v.total) * 100) : 0
    return v
  }).sort((a, b) => b.used - a.used)

  const totalMandaysPlanned = Math.round(mandaysPerVendor.reduce((s, v) => s + v.planned, 0) * 10) / 10
  const totalMandaysUsed = Math.round(mandaysPerVendor.reduce((s, v) => s + v.used, 0) * 10) / 10
  const totalMandaysRemaining = Math.round(mandaysPerVendor.reduce((s, v) => s + v.remaining, 0) * 10) / 10

  return c.json(ok({
    // KPI Summary
    summary: {
      totalRequests,
      activeProjects,
      completed: completedItems.length,
      delayed: delayedItems.length,
      avgCycleTimeDays: Math.round(avgCycleTime),
      slaAchievement: Math.round(slaAchievement),
    },
    
    // Charts data
    requestsByStatus,
    requestsByPriority,
    monthlyTrend,
    projectProgress,
    timelineProjects,
    slaBreakdown,
    workloadByAssignee,
    avgCycleTimeByStage,
    recentActivity,
    projectsHealth,

    // Mandays per vendor
    mandaysPerVendor,
    mandaysSummary: {
      totalUsed: totalMandaysUsed,
      totalRemaining: totalMandaysRemaining,
      totalTopup: mandaysPerVendor.reduce((s, v) => s + v.topup, 0),
    },
    
    // Raw data for export
    _exportData: {
      items: items.map(i => ({
        ticketNumber: i.ticketNumber,
        title: i.title,
        status: i.status,
        priority: i.priority,
        department: i.department?.name,
        vendor: i.vendor?.name,
        createdAt: i.createdAt,
        dueDate: i.dueDate,
        goLiveDate: i.goLiveDate,
      })),
    },
  }))
})

// Mandays Report - Comprehensive mandays usage and allocation tracking
app.get('/mandays', authMiddleware, requireRole(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.BUSINESS_ANALYST), zValidator('query', reportQuerySchema), async (c) => {
  const { startDate, endDate, departmentId, vendorId, year, quarter, month } = c.req.valid('query')
  const db = c.get('db')

  // Build date filter untuk trend & topup filtering
  let periodStart: Date | null = null
  let periodEnd: Date | null = null
  
  if (startDate && endDate) {
    periodStart = new Date(startDate)
    periodEnd = new Date(endDate)
  } else if (year && quarter) {
    const y = parseInt(year)
    const q = parseInt(quarter)
    const startMonth = (q - 1) * 3
    const endMonth = startMonth + 2
    periodStart = new Date(y, startMonth, 1)
    periodEnd = new Date(y, endMonth + 1, 0, 23, 59, 59)
  } else if (year && month) {
    const y = parseInt(year)
    const m = parseInt(month) - 1
    periodStart = new Date(y, m, 1)
    periodEnd = new Date(y, m + 1, 0, 23, 59, 59)
  } else if (year) {
    const y = parseInt(year)
    periodStart = new Date(y, 0, 1)
    periodEnd = new Date(y, 11, 31, 23, 59, 59)
  }

  // Untuk work items: TIDAK filter by date - tampilkan semua CR yang punya mandays data
  // Filter hanya by departmentId dan vendorId
  let workItemConditions: any[] = []
  if (departmentId) workItemConditions.push(eq(schema.workItems.departmentId, departmentId))
  if (vendorId) workItemConditions.push(eq(schema.workItems.vendorId, vendorId))

  const workItemWhere = workItemConditions.length > 0 ? and(...workItemConditions) : undefined

  // Get ALL work items yang punya vendor (untuk mandays tracking)
  const allWorkItems = await db.query.workItems.findMany({
    where: workItemWhere,
    with: {
      department: true,
      vendor: true,
      assessment: true,
      developer: true,
    },
  })

  // Filter: hanya tampilkan work items yang punya mandays data (actual atau planned)
  // Jika ada period filter, juga include items yang dibuat dalam periode
  const workItems = allWorkItems.filter(item => {
    const hasMandays = item.mandays || item.assessment?.estimatedManDays
    if (!hasMandays) return false

    // Jika ada period filter, filter berdasarkan createdAt
    if (periodStart && periodEnd) {
      const created = new Date(item.createdAt)
      return created >= periodStart && created <= periodEnd
    }

    return true
  })

  // Get all mandays topups - filter by period jika ada
  let topupConditions: any[] = []
  if (periodStart && periodEnd) {
    topupConditions.push(gte(schema.mandaysTopups.createdAt, periodStart))
    topupConditions.push(lte(schema.mandaysTopups.createdAt, periodEnd))
  }
  if (vendorId) topupConditions.push(eq(schema.mandaysTopups.vendorId, vendorId))

  const topupWhere = topupConditions.length > 0 ? and(...topupConditions) : undefined

  const topups = await db.query.mandaysTopups.findMany({
    where: topupWhere,
    with: {
      vendor: true,
      createdByUser: true,
    },
    orderBy: [desc(schema.mandaysTopups.createdAt)],
  })

  // Calculate mandays by vendor
  const vendorMandaysMap = new Map<string, {
    vendorId: string
    vendorName: string
    planned: number
    actual: number
    topup: number
    total: number
    used: number
    remaining: number
    utilizationPercent: number
  }>()

  // Sum up planned mandays (from assessments)
  workItems.forEach(item => {
    if (item.vendor && item.assessment?.estimatedManDays) {
      const vendorId = item.vendor.id
      const vendorName = item.vendor.name
      
      if (!vendorMandaysMap.has(vendorId)) {
        vendorMandaysMap.set(vendorId, {
          vendorId,
          vendorName,
          planned: 0,
          actual: 0,
          topup: 0,
          total: 0,
          used: 0,
          remaining: 0,
          utilizationPercent: 0,
        })
      }
      
      const entry = vendorMandaysMap.get(vendorId)!
      entry.planned += item.assessment.estimatedManDays
    }
  })

  // Sum up actual mandays used (from work items)
  workItems.forEach(item => {
    if (item.vendor && item.mandays) {
      const vendorId = item.vendor.id
      const vendorName = item.vendor.name
      
      if (!vendorMandaysMap.has(vendorId)) {
        vendorMandaysMap.set(vendorId, {
          vendorId,
          vendorName,
          planned: 0,
          actual: 0,
          topup: 0,
          total: 0,
          used: 0,
          remaining: 0,
          utilizationPercent: 0,
        })
      }
      
      const entry = vendorMandaysMap.get(vendorId)!
      entry.actual += item.mandays
      entry.used += item.mandays
    }
  })

  // Sum up topups
  topups.forEach(topup => {
    const vendorId = topup.vendorId
    const vendorName = topup.vendor.name
    
    if (!vendorMandaysMap.has(vendorId)) {
      vendorMandaysMap.set(vendorId, {
        vendorId,
        vendorName,
        planned: 0,
        actual: 0,
        topup: 0,
        total: 0,
        used: 0,
        remaining: 0,
        utilizationPercent: 0,
      })
    }
    
    const entry = vendorMandaysMap.get(vendorId)!
    entry.topup += topup.mandays
  })

  // Calculate totals and remaining
  const vendorMandays = Array.from(vendorMandaysMap.values()).map(vendor => {
    vendor.total = vendor.planned + vendor.topup
    vendor.remaining = vendor.total - vendor.used
    vendor.utilizationPercent = vendor.total > 0 ? Math.round((vendor.used / vendor.total) * 100) : 0
    return vendor
  })

  // Calculate overall summary
  const totalPlanned = vendorMandays.reduce((sum, v) => sum + v.planned, 0)
  const totalTopup = vendorMandays.reduce((sum, v) => sum + v.topup, 0)
  const totalAllocated = totalPlanned + totalTopup
  const totalUsed = vendorMandays.reduce((sum, v) => sum + v.used, 0)
  const totalRemaining = totalAllocated - totalUsed
  const avgUtilization = totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0

  // Mandays by project
  const projectMandays = workItems
    .filter(item => item.mandays || item.assessment?.estimatedManDays)
    .map(item => ({
      ticketNumber: item.ticketNumber,
      title: item.title,
      vendor: item.vendor?.name,
      department: item.department?.name,
      developer: item.developer?.name,
      planned: item.assessment?.estimatedManDays || 0,
      actual: item.mandays || 0,
      variance: (item.mandays || 0) - (item.assessment?.estimatedManDays || 0),
      utilizationPercent: item.assessment?.estimatedManDays 
        ? Math.round(((item.mandays || 0) / item.assessment.estimatedManDays) * 100)
        : 0,
      status: item.status,
      createdAt: item.createdAt,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // Mandays trend - sesuaikan range dengan filter yang dipilih
  const mandaysTrend: any[] = []

  const getItemsInRange = (start: Date, end: Date) => {
    return allWorkItems.filter(item => {
      if (!item.vendor) return false
      if (vendorId && item.vendor.id !== vendorId) return false
      const created = new Date(item.createdAt)
      return created >= start && created <= end
    })
  }

  const getTopupsInRange = (start: Date, end: Date) => {
    return topups.filter(t => {
      const created = new Date(t.createdAt)
      return created >= start && created <= end
    })
  }

  const sumMandays = (items: typeof allWorkItems) => ({
    planned: Math.round(items.reduce((s, i) => s + (i.assessment?.estimatedManDays || 0), 0) * 10) / 10,
    actual: Math.round(items.reduce((s, i) => s + (i.mandays || 0), 0) * 10) / 10,
  })

  if (year && month) {
    // Monthly filter → tampilkan 4-5 minggu dalam bulan tsb
    const y = parseInt(year)
    const m = parseInt(month) - 1
    const firstDay = new Date(y, m, 1)
    const lastDay = new Date(y, m + 1, 0)
    let weekStart = new Date(firstDay)
    let weekNum = 1
    while (weekStart <= lastDay) {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      if (weekEnd > lastDay) weekEnd.setTime(lastDay.getTime())
      weekEnd.setHours(23, 59, 59)
      const items = getItemsInRange(weekStart, weekEnd)
      const topupItems = getTopupsInRange(weekStart, weekEnd)
      const sums = sumMandays(items)
      mandaysTrend.push({
        month: `Week ${weekNum}`,
        planned: sums.planned,
        actual: sums.actual,
        topup: Math.round(topupItems.reduce((s, t) => s + t.mandays, 0) * 10) / 10,
      })
      weekStart = new Date(weekEnd)
      weekStart.setDate(weekStart.getDate() + 1)
      weekStart.setHours(0, 0, 0, 0)
      weekNum++
    }
  } else if (year && quarter) {
    // Quarterly filter → tampilkan 3 bulan dalam quarter tsb
    const y = parseInt(year)
    const q = parseInt(quarter)
    const startMonth = (q - 1) * 3
    for (let i = 0; i < 3; i++) {
      const mStart = new Date(y, startMonth + i, 1)
      const mEnd = new Date(y, startMonth + i + 1, 0, 23, 59, 59)
      const items = getItemsInRange(mStart, mEnd)
      const topupItems = getTopupsInRange(mStart, mEnd)
      const sums = sumMandays(items)
      mandaysTrend.push({
        month: mStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        planned: sums.planned,
        actual: sums.actual,
        topup: Math.round(topupItems.reduce((s, t) => s + t.mandays, 0) * 10) / 10,
      })
    }
  } else if (year) {
    // Yearly filter → tampilkan 12 bulan Jan–Dec tahun tsb
    const y = parseInt(year)
    for (let m = 0; m < 12; m++) {
      const mStart = new Date(y, m, 1)
      const mEnd = new Date(y, m + 1, 0, 23, 59, 59)
      const items = getItemsInRange(mStart, mEnd)
      const topupItems = getTopupsInRange(mStart, mEnd)
      const sums = sumMandays(items)
      mandaysTrend.push({
        month: mStart.toLocaleDateString('en-US', { month: 'short' }),
        planned: sums.planned,
        actual: sums.actual,
        topup: Math.round(topupItems.reduce((s, t) => s + t.mandays, 0) * 10) / 10,
      })
    }
  } else if (startDate && endDate && periodStart && periodEnd) {
    // Custom range → tampilkan per bulan dalam range
    const cursor = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1)
    const rangeEnd = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 0, 23, 59, 59)
    while (cursor <= rangeEnd) {
      const mStart = new Date(cursor)
      const mEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59)
      const items = getItemsInRange(mStart, mEnd)
      const topupItems = getTopupsInRange(mStart, mEnd)
      const sums = sumMandays(items)
      mandaysTrend.push({
        month: cursor.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        planned: sums.planned,
        actual: sums.actual,
        topup: Math.round(topupItems.reduce((s, t) => s + t.mandays, 0) * 10) / 10,
      })
      cursor.setMonth(cursor.getMonth() + 1)
    }
  } else {
    // No filter → last 6 months
    const endDateObj = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(endDateObj)
      d.setMonth(d.getMonth() - i)
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1)
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
      const items = getItemsInRange(mStart, mEnd)
      const topupItems = getTopupsInRange(mStart, mEnd)
      const sums = sumMandays(items)
      mandaysTrend.push({
        month: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        planned: sums.planned,
        actual: sums.actual,
        topup: Math.round(topupItems.reduce((s, t) => s + t.mandays, 0) * 10) / 10,
      })
    }
  }

  // Top over-allocated projects (actual > planned)
  const overAllocated = projectMandays
    .filter(p => p.variance > 0)
    .sort((a, b) => b.variance - a.variance)
    .slice(0, 10)

  // Mandays deviation analysis
  const deviationAnalysis = workItems
    .filter(item => item.assessment?.estimatedManDays && item.mandays)
    .map(item => {
      const planned = item.assessment!.estimatedManDays!
      const actual = item.mandays!
      const deviation = ((actual - planned) / planned) * 100
      
      return {
        ticketNumber: item.ticketNumber,
        title: item.title,
        vendor: item.vendor?.name,
        planned,
        actual,
        deviation: Math.round(deviation),
      }
    })

  const within10Percent = deviationAnalysis.filter(d => Math.abs(d.deviation) <= 10).length
  const within20Percent = deviationAnalysis.filter(d => Math.abs(d.deviation) > 10 && Math.abs(d.deviation) <= 20).length
  const over20Percent = deviationAnalysis.filter(d => Math.abs(d.deviation) > 20).length

  return c.json(ok({
    summary: {
      totalPlanned: Math.round(totalPlanned * 10) / 10,
      totalTopup: Math.round(totalTopup * 10) / 10,
      totalAllocated: Math.round(totalAllocated * 10) / 10,
      totalUsed: Math.round(totalUsed * 10) / 10,
      totalRemaining: Math.round(totalRemaining * 10) / 10,
      avgUtilization: Math.round(avgUtilization * 10) / 10,
    },
    vendorMandays: vendorMandays.map(v => ({
      ...v,
      planned: Math.round(v.planned * 10) / 10,
      actual: Math.round(v.actual * 10) / 10,
      topup: Math.round(v.topup * 10) / 10,
      total: Math.round(v.total * 10) / 10,
      used: Math.round(v.used * 10) / 10,
      remaining: Math.round(v.remaining * 10) / 10,
    })),
    projectMandays,
    mandaysTrend,
    topups: topups.map(t => ({
      id: t.id,
      vendor: t.vendor.name,
      vendorId: t.vendorId,
      mandays: t.mandays,
      notes: t.notes,
      createdBy: t.createdByUser.name,
      createdAt: t.createdAt,
    })),
    overAllocated,
    deviationAnalysis: {
      within10Percent,
      within20Percent,
      over20Percent,
      total: deviationAnalysis.length,
    },
  }))
})

// Add Mandays Top-up
const mandaysTopupSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  mandays: z.number().positive('Mandays must be positive'),
  notes: z.string().optional(),
})

app.post('/mandays/topup', authMiddleware, requireRole(UserRole.ADMINISTRATOR, UserRole.MANAGER), zValidator('json', mandaysTopupSchema), async (c) => {
  const { vendorId, mandays, notes } = c.req.valid('json')
  const db = c.get('db')
  const user = c.get('user')!

  // Verify vendor exists
  const vendor = await db.query.vendors.findFirst({ where: eq(schema.vendors.id, vendorId) })
  if (!vendor) return c.json(err('Vendor not found'), 404)

  const id = generateId()

  await db.insert(schema.mandaysTopups).values({
    id,
    vendorId,
    mandays,
    notes: notes || null,
    createdBy: user.sub,
    createdAt: new Date(),
  })

  // Create audit log
  await db.insert(schema.auditLogs).values({
    id: generateId(),
    userId: user.sub,
    action: 'create',
    entityType: 'mandays_topup',
    entityId: id,
    newValues: { vendorId, mandays, notes },
    createdAt: new Date(),
  })

  return c.json(ok({ id, vendorId, mandays, notes }, 'Mandays top-up added successfully'))
})

export default app
