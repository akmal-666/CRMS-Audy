import { Hono } from 'hono'
import { count, and, gte, sql, desc } from 'drizzle-orm'
import type { Bindings, Variables } from '../types'
import { schema } from '@crms/db'
import { ok } from '../lib/response'
import { authMiddleware } from '../middleware/auth'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.get('/stats', authMiddleware, async (c) => {
  const db = c.get('db')
  const now = Date.now()

  // Optional filter params from frontend
  const { year, quarter, month } = c.req.query()

  // Build date range for filtered queries
  let dateFrom: number | null = null
  let dateTo: number | null = null

  if (year) {
    const y = parseInt(year)
    if (quarter) {
      const qMap: Record<string, [number, number]> = {
        Q1: [0, 2], Q2: [3, 5], Q3: [6, 8], Q4: [9, 11]
      }
      const [fromM, toM] = qMap[quarter] ?? [0, 11]
      dateFrom = new Date(y, fromM, 1).getTime()
      dateTo = new Date(y, toM + 1, 0, 23, 59, 59).getTime()
    } else if (month) {
      const m = parseInt(month) - 1
      dateFrom = new Date(y, m, 1).getTime()
      dateTo = new Date(y, m + 1, 0, 23, 59, 59).getTime()
    } else {
      dateFrom = new Date(y, 0, 1).getTime()
      dateTo = new Date(y, 11, 31, 23, 59, 59).getTime()
    }
  }

  // Date filter condition (applies to all queries if set)
  const dateFilter = dateFrom && dateTo
    ? and(
        sql`${schema.workItems.createdAt} >= ${dateFrom}`,
        sql`${schema.workItems.createdAt} <= ${dateTo}`
      )
    : undefined

  const [statusCounts, priorityCounts, overdueCount, recentItems, upcomingDeadlines, monthlyStats, baWorkload] = await Promise.all([

    // Status breakdown (filtered by date if provided)
    db.select({ status: schema.workItems.status, count: count() })
      .from(schema.workItems)
      .where(dateFilter)
      .groupBy(schema.workItems.status),

    // Priority breakdown (filtered)
    db.select({ priority: schema.workItems.priority, count: count() })
      .from(schema.workItems)
      .where(dateFilter)
      .groupBy(schema.workItems.priority),

    // Overdue count (filtered)
    db.select({ count: count() })
      .from(schema.workItems)
      .where(and(
        dateFilter,
        sql`${schema.workItems.dueDate} < ${now}`,
        sql`${schema.workItems.status} NOT IN ('go_live', 'drop')`
      )),

    // Recent items for ongoing projects (filtered)
    db.query.workItems.findMany({
      limit: 10,
      orderBy: [desc(schema.workItems.createdAt)],
      where: dateFrom && dateTo
        ? and(
            sql`${schema.workItems.status} IN ('assessment', 'development', 'uat', 'deployment')`,
            sql`${schema.workItems.createdAt} >= ${dateFrom}`,
            sql`${schema.workItems.createdAt} <= ${dateTo}`
          )
        : sql`${schema.workItems.status} IN ('assessment', 'development', 'uat', 'deployment')`,
      with: {
        department: true,
        manager: { columns: { id: true, name: true } },
        businessAnalyst: { columns: { id: true, name: true } },
        developer: { columns: { id: true, name: true } },
        qa: { columns: { id: true, name: true } },
      },
      columns: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        dueDate: true,
        goLiveDate: true,
      },
    }),

    // Upcoming deadlines (always all-time — not filtered by creation date)
    db.query.workItems.findMany({
      limit: 10,
      where: and(
        sql`${schema.workItems.dueDate} > ${now}`,
        sql`${schema.workItems.status} NOT IN ('go_live', 'drop')`
      ),
      orderBy: [sql`${schema.workItems.dueDate} ASC`],
      with: { department: true },
      columns: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        dueDate: true,
      },
    }),

    // Monthly requests (last 6 months — always all-time for trend data)
    db.select({
      month: sql<string>`strftime('%Y-%m', datetime(${schema.workItems.createdAt}/1000, 'unixepoch'))`,
      count: count(),
    })
      .from(schema.workItems)
      .where(gte(schema.workItems.createdAt, new Date(Date.now() - 6 * 30 * 24 * 3600 * 1000)))
      .groupBy(sql`strftime('%Y-%m', datetime(${schema.workItems.createdAt}/1000, 'unixepoch'))`),

    // Business Analyst workload (filtered)
    db.select({
      businessAnalystId: schema.workItems.businessAnalystId,
      count: count(),
    })
      .from(schema.workItems)
      .where(and(
        dateFilter,
        sql`${schema.workItems.businessAnalystId} IS NOT NULL`,
        sql`${schema.workItems.status} NOT IN ('go_live', 'drop')`
      ))
      .groupBy(schema.workItems.businessAnalystId),
  ])

  const totalCount = statusCounts.reduce((sum, s) => sum + s.count, 0)

  const byStatus: Record<string, number> = {}
  statusCounts.forEach(s => { byStatus[s.status] = s.count })

  const byPriority: Record<string, number> = {}
  priorityCounts.forEach(p => { byPriority[p.priority] = p.count })

  // Portfolio progress = go_live / total (filtered)
  const portfolioProgress = totalCount > 0
    ? Math.round(((byStatus['go_live'] ?? 0) / totalCount) * 100)
    : 0

  // Get BA users
  const baUserIds = baWorkload.map(r => r.businessAnalystId).filter(Boolean) as string[]
  const baUsers = baUserIds.length > 0
    ? await db.select({ id: schema.users.id, name: schema.users.name })
        .from(schema.users)
        .where(sql`${schema.users.id} IN (${sql.join(baUserIds.map(id => sql`${id}`), sql`, `)})`)
    : []

  const baUserMap = Object.fromEntries(baUsers.map(u => [u.id, u.name]))
  const businessAnalysts = baWorkload.map(r => ({
    id: r.businessAnalystId!,
    name: baUserMap[r.businessAnalystId!] || 'Unknown',
    count: r.count,
  }))

  return c.json(ok({
    total: totalCount,
    byStatus,
    byPriority,
    overdue: overdueCount[0]?.count ?? 0,
    portfolioProgress, // calculated from filtered data
    recentItems,
    upcomingDeadlines,
    monthlyTrend: monthlyStats,
    businessAnalysts,
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
  const devUsers = userIds.length > 0
    ? await db.select({ id: schema.users.id, name: schema.users.name })
        .from(schema.users)
        .where(sql`${schema.users.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`)
    : []

  const userMap = Object.fromEntries(devUsers.map(u => [u.id, u.name]))

  return c.json(ok(result.map(r => ({
    developer: userMap[r.developerId!] || 'Unknown',
    count: r.count,
  }))))
})

export default app
