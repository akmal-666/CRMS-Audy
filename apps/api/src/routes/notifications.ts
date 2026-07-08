import { Hono } from 'hono'
import { eq, and, desc, count } from 'drizzle-orm'
import type { Bindings, Variables } from '../types'
import { schema } from '@crms/db'
import { ok } from '../lib/response'
import { generateId } from '../lib/id'
import { authMiddleware } from '../middleware/auth'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.get('/', authMiddleware, async (c) => {
  const user = c.get('user')!
  const db = c.get('db')
  const { page = '1', pageSize = '20' } = c.req.query()

  const pageNum = parseInt(page)
  const pageSizeNum = parseInt(pageSize)
  const offset = (pageNum - 1) * pageSizeNum

  const [notifications, totalResult, unreadResult] = await Promise.all([
    db.query.notifications.findMany({
      where: eq(schema.notifications.userId, user.sub),
      limit: pageSizeNum,
      offset,
      orderBy: [desc(schema.notifications.createdAt)],
    }),
    db.select({ count: count() }).from(schema.notifications).where(eq(schema.notifications.userId, user.sub)),
    db.select({ count: count() }).from(schema.notifications).where(
      and(eq(schema.notifications.userId, user.sub), eq(schema.notifications.isRead, false))
    ),
  ])

  return c.json(ok({
    notifications,
    total: totalResult[0]?.count ?? 0,
    unread: unreadResult[0]?.count ?? 0,
  }))
})

app.patch('/:id/read', authMiddleware, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')!
  const db = c.get('db')

  await db.update(schema.notifications)
    .set({ isRead: true })
    .where(and(eq(schema.notifications.id, id), eq(schema.notifications.userId, user.sub)))

  return c.json(ok(null, 'Notification marked as read'))
})

app.patch('/read-all', authMiddleware, async (c) => {
  const user = c.get('user')!
  const db = c.get('db')

  await db.update(schema.notifications)
    .set({ isRead: true })
    .where(and(eq(schema.notifications.userId, user.sub), eq(schema.notifications.isRead, false)))

  return c.json(ok(null, 'All notifications marked as read'))
})

export default app
