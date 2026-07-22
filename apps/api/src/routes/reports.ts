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
  year: z.string().optional(),
  quarter: z.string().optional(),
  month: z.string().optional(),
})

// Get comprehensive report data
app.get('/', authMiddleware, requireRole(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.BUSINESS_ANALYST), zValidator('query', reportQuerySchema), async (c) => {
  const { startDate, endDate, departmentId, year, quarter, month } = c.req.valid('query')
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

export default app
