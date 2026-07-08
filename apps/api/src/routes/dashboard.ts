import { Hono } from 'hono'
import { eq, count, and, gte, sql, desc } from 'drizzle-orm'
import type { Bindings, Variables } from '../types'
import { schema } from '@crms/db'
import { ok } from '../lib/response'
import { authMiddleware } from '../middleware/auth'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.get('/stats', authMiddleware, async (c) => {
  const db = c.get('db')

  const [statusCounts, priorityCounts, overdueCount, recentItems, monthlyStats] = await Promise.all([
    // Status breakdown
    db.select({ status: schema.workItems.status, count: count() })
      .from(schema.workItems)
      .groupBy(schema.workItems.status),

    // Priority breakdown
    db.select({ priority: schema.workItems.priority, count: count() })
      .from(schema.workItems)
      .groupBy(schema.workItems.priority),

    // Overdue count
    db.select({ count: count() })
      .from(schema.workItems)
      .where(and(
        sql`${schema.workItems.dueDate} < ${Date.now()}`,
        sql`${schema.workItems.status} NOT IN ('go_live', 'drop')`
      )),

    // Recent items
    db.query.workItems.findMany({
      limit: 5,
      orderBy: [desc(schema.workItems.createdAt)],
      with: { department: true },
      columns: { id: true, ticketNumber: true, title: true, status: true, priority: true, createdAt: true },
    }),

    // Monthly requests (last 6 months)
    db.select({
      month: sql<string>`strftime('%Y-%m', datetime(${schema.workItems.createdAt}/1000, 'unixepoch'))`,
      count: count(),
    })
      .from(schema.workItems)
      .where(gte(schema.workItems.createdAt, new Date(Date.now() - 6 * 30 * 24 * 3600 * 1000)))
      .groupBy(sql`strftime('%Y-%m', datetime(${schema.workItems.createdAt}/1000, 'unixepoch'))`),
  ])

  const totalCount = statusCounts.reduce((sum, s) => sum + s.count, 0)

  const byStatus: Record<string, number> = {}
  statusCounts.forEach(s => { byStatus[s.status] = s.count })

  const byPriority: Record<string, number> = {}
  priorityCounts.forEach(p => { byPriority[p.priority] = p.count })

  return c.json(ok({
    total: totalCount,
    byStatus,
    byPriority,
    overdue: overdueCount[0]?.count ?? 0,
    recentItems,
    monthlyTrend: monthlyStats,
  }))
})

// Department breakdown
app.get('/department-breakdown', authMiddleware, async (c) => {
  const db = c.get('db')

  const result = await db.select({
    departmentId: schema.workItems.departmentId,
    count: count(),
  })
    .from(schema.workItems)
    .groupBy(schema.workItems.departmentId)

  const departments = await db.query.departments.findMany()
  const deptMap = Object.fromEntries(departments.map(d => [d.id, d.name]))

  return c.json(ok(result.map(r => ({
    department: deptMap[r.departmentId] || r.departmentId,
    count: r.count,
  }))))
})

// Developer workload
app.get('/developer-workload', authMiddleware, async (c) => {
  const db = c.get('db')

  const result = await db.select({
    developerId: schema.workItems.developerId,
    count: count(),
  })
    .from(schema.workItems)
    .where(and(
      sql`${schema.workItems.developerId} IS NOT NULL`,
      sql`${schema.workItems.status} IN ('development', 'uat', 'deployment')`
    ))
    .groupBy(schema.workItems.developerId)

  const userIds = result.map(r => r.developerId).filter(Boolean) as string[]
  const devUsers = userIds.length > 0 ? await db.select({ id: schema.users.id, name: schema.users.name })
    .from(schema.users)
    .where(sql`${schema.users.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`) : []

  const userMap = Object.fromEntries(devUsers.map(u => [u.id, u.name]))

  return c.json(ok(result.map(r => ({
    developer: userMap[r.developerId!] || 'Unknown',
    count: r.count,
  }))))
})

export default app
