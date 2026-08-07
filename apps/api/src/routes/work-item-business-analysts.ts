import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import type { Bindings, Variables } from '../types'
import { schema } from '@crms/db'
import { ok, err } from '../lib/response'
import { generateId } from '../lib/id'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { UserRole } from '@crms/types'
import { ASSIGNMENT_ROLES } from '../middleware/rbac'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /:workItemId/business-analysts — list all BAs for a work item
app.get('/:workItemId/business-analysts', authMiddleware, async (c) => {
  const { workItemId } = c.req.param()
  const db = c.get('db')

  const records = await db.query.workItemBusinessAnalysts.findMany({
    where: eq(schema.workItemBusinessAnalysts.workItemId, workItemId),
    with: {
      user: {
        columns: { id: true, name: true, email: true, avatarUrl: true, role: true },
      },
    },
    orderBy: [schema.workItemBusinessAnalysts.createdAt],
  }).catch(() => [])

  return c.json(ok(records.map(r => r.user)))
})

// POST /:workItemId/business-analysts — add a BA
app.post(
  '/:workItemId/business-analysts',
  authMiddleware,
  requireRole(...ASSIGNMENT_ROLES),
  zValidator('json', z.object({ userId: z.string().min(1) })),
  async (c) => {
    const { workItemId } = c.req.param()
    const { userId } = c.req.valid('json')
    const db = c.get('db')
    const user = c.get('user')!

    // Verify work item exists
    const workItem = await db.query.workItems.findFirst({
      where: eq(schema.workItems.id, workItemId),
      columns: { id: true, ticketNumber: true, title: true },
    })
    if (!workItem) return c.json(err('Work item not found'), 404)

    // Verify target user exists and is a BA
    const targetUser = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: { id: true, name: true, role: true },
    })
    if (!targetUser) return c.json(err('User not found'), 404)
    if (targetUser.role !== UserRole.BUSINESS_ANALYST && targetUser.role !== UserRole.ADMINISTRATOR) {
      return c.json(err('User is not a Business Analyst'), 400)
    }

    // Check if already assigned (ignore duplicate gracefully)
    const existing = await db.query.workItemBusinessAnalysts.findFirst({
      where: and(
        eq(schema.workItemBusinessAnalysts.workItemId, workItemId),
        eq(schema.workItemBusinessAnalysts.userId, userId),
      ),
    })
    if (existing) return c.json(ok(null, 'Already assigned'), 200)

    // Insert
    const id = generateId()
    await db.insert(schema.workItemBusinessAnalysts).values({
      id,
      workItemId,
      userId,
      addedBy: user.sub,
      createdAt: new Date(),
    })

    // Also sync the legacy businessAnalystId to the first assigned BA
    // (so existing queries that read businessAnalystId still work)
    const allBAs = await db.query.workItemBusinessAnalysts.findMany({
      where: eq(schema.workItemBusinessAnalysts.workItemId, workItemId),
      orderBy: [schema.workItemBusinessAnalysts.createdAt],
    })
    if (allBAs.length === 1) {
      // First BA — sync to legacy field
      await db.update(schema.workItems)
        .set({ businessAnalystId: userId, updatedAt: new Date() })
        .where(eq(schema.workItems.id, workItemId))
    }

    // Activity log
    await db.insert(schema.activityLogs).values({
      id: generateId(),
      workItemId,
      userId: user.sub,
      action: 'assigned',
      description: `Business Analyst ${targetUser.name} assigned to ${workItem.ticketNumber}`,
      createdAt: new Date(),
    })

    // Notification
    await db.insert(schema.notifications).values({
      id: generateId(),
      userId,
      type: 'assignment',
      title: 'You have been assigned to a CR',
      message: `You have been assigned as Business Analyst to ${workItem.ticketNumber}: ${workItem.title}`,
      workItemId,
      isRead: false,
      createdAt: new Date(),
    })

    return c.json(ok({ id }, 'Business Analyst assigned'), 201)
  }
)

// DELETE /:workItemId/business-analysts/:userId — remove a BA
app.delete(
  '/:workItemId/business-analysts/:userId',
  authMiddleware,
  requireRole(...ASSIGNMENT_ROLES),
  async (c) => {
    const { workItemId, userId } = c.req.param()
    const db = c.get('db')
    const user = c.get('user')!

    const existing = await db.query.workItemBusinessAnalysts.findFirst({
      where: and(
        eq(schema.workItemBusinessAnalysts.workItemId, workItemId),
        eq(schema.workItemBusinessAnalysts.userId, userId),
      ),
    })
    if (!existing) return c.json(err('Assignment not found'), 404)

    await db.delete(schema.workItemBusinessAnalysts).where(
      and(
        eq(schema.workItemBusinessAnalysts.workItemId, workItemId),
        eq(schema.workItemBusinessAnalysts.userId, userId),
      )
    )

    // Sync legacy businessAnalystId — set to next oldest BA or null
    const remaining = await db.query.workItemBusinessAnalysts.findMany({
      where: eq(schema.workItemBusinessAnalysts.workItemId, workItemId),
      orderBy: [schema.workItemBusinessAnalysts.createdAt],
    })
    await db.update(schema.workItems)
      .set({ businessAnalystId: remaining[0]?.userId ?? null, updatedAt: new Date() })
      .where(eq(schema.workItems.id, workItemId))

    // Activity log
    await db.insert(schema.activityLogs).values({
      id: generateId(),
      workItemId,
      userId: user.sub,
      action: 'assigned',
      description: `Business Analyst removed from work item`,
      createdAt: new Date(),
    })

    return c.json(ok(null, 'Business Analyst removed'))
  }
)

export default app
