import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm'
import type { Bindings, Variables } from '../types'
import { schema } from '@crms/db'
import { ok } from '../lib/response'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { UserRole } from '@crms/types'

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

  // Filter items: include ACTIVE projects OR projects in selected period
  const items = allItems.filter(item => {
    // Selalu tampilkan project yang masih aktif (belum selesai)
    const isActive = !['go_live', 'drop', 'in_pipeline'].includes(item.status)
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

  // Health distribution over time (last 6 months)
  const healthTrend: any[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    
    const monthProjects = projectsWithHealth.filter(p => {
      const created = new Date(p.createdAt)
      return created >= monthStart && created <= monthEnd
    })
    
    healthTrend.push({
      month: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      excellent: monthProjects.filter(p => p.healthStatus === 'excellent').length,
      good: monthProjects.filter(p => p.healthStatus === 'good').length,
      atRisk: monthProjects.filter(p => p.healthStatus === 'at-risk').length,
      critical: monthProjects.filter(p => p.healthStatus === 'critical').length,
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
      activityLogs: { orderBy: [desc(schema.activityLogs.createdAt)], limit: 10 },
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

  // Calculate metrics with proper handling
  const avgCycleTime = completedItems.length > 0
    ? completedItems.reduce((acc, item) => {
        const days = Math.floor((new Date(item.goLiveDate!).getTime() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        return acc + days
      }, 0) / completedItems.length
    : 0

  // SLA Achievement
  const slaItems = completedItems.map(item => {
    const cycleTime = Math.floor((new Date(item.goLiveDate!).getTime() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24))
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

  // Average cycle time by stage
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
        const days = Math.floor((new Date(stageEnd.createdAt).getTime() - new Date(stageStart.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        if (!stageMap.has(stage)) stageMap.set(stage, [])
        stageMap.get(stage)!.push(days)
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
      const totalDuration = due ? due.getTime() - created.getTime() : 0
      const elapsed = now.getTime() - created.getTime()
      const progressPercentage = totalDuration > 0 ? Math.min((elapsed / totalDuration) * 100, 100) : 0
      
      let statusProgress = 0
      if (item.status === 'assessment') statusProgress = 25
      else if (item.status === 'development') statusProgress = 50
      else if (item.status === 'uat') statusProgress = 75
      else if (item.status === 'deployment') statusProgress = 90
      
      const cycleTimeDays = Math.floor(elapsed / (1000 * 60 * 60 * 24))
      const slaTarget = item.priority === 'critical' ? 15 : item.priority === 'high' ? 30 : 60
      
      // Calculate issues count (simplified)
      const issuesInProgress = item.status === 'development' || item.status === 'uat' ? 1 : 0
      const issuesDone = item.status === 'go_live' ? 1 : 0
      
      return {
        name: item.title,
        ticketNumber: item.ticketNumber,
        progress: statusProgress,
        status: item.status,
        health,
        priority: item.priority,
        openIssues: Math.floor(Math.random() * 20), // Placeholder - should come from actual issues/tasks
        inProgressIssues: issuesInProgress,
        doneIssues: issuesDone,
        avgCycleTime: cycleTimeDays,
        sla: cycleTimeDays <= slaTarget ? 'on-time' : 'overdue',
      }
    })

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

export default app
