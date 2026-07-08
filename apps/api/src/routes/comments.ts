import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, desc } from 'drizzle-orm'
import type { Bindings, Variables } from '../types'
import { schema } from '@crms/db'
import { ok, err } from '../lib/response'
import { generateId } from '../lib/id'
import { authMiddleware } from '../middleware/auth'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const commentSchema = z.object({
  content: z.string().min(1).max(2000),
})

app.post('/:workItemId/comments', authMiddleware, zValidator('json', commentSchema), async (c) => {
  const { workItemId } = c.req.param()
  const { content } = c.req.valid('json')
  const user = c.get('user')!
  const db = c.get('db')

  const item = await db.query.workItems.findFirst({ where: eq(schema.workItems.id, workItemId) })
  if (!item) return c.json(err('Work item not found'), 404)

  const id = generateId()
  await db.insert(schema.comments).values({
    id,
    workItemId,
    userId: user.sub,
    content,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  await db.insert(schema.activityLogs).values({
    id: generateId(),
    workItemId,
    userId: user.sub,
    action: 'commented',
    description: `Comment added`,
    createdAt: new Date(),
  })

  return c.json(ok({ id }, 'Comment added'), 201)
})

app.delete('/:workItemId/comments/:commentId', authMiddleware, async (c) => {
  const { workItemId, commentId } = c.req.param()
  const user = c.get('user')!
  const db = c.get('db')

  const comment = await db.query.comments.findFirst({ where: eq(schema.comments.id, commentId) })
  if (!comment) return c.json(err('Comment not found'), 404)
  if (comment.userId !== user.sub && user.role !== 'administrator') {
    return c.json(err('Forbidden'), 403)
  }

  await db.delete(schema.comments).where(eq(schema.comments.id, commentId))
  return c.json(ok(null, 'Comment deleted'))
})

export default app
