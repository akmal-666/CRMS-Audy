import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, asc } from 'drizzle-orm'
import type { Bindings, Variables } from '../types'
import { schema } from '@crms/db'
import { ok, err } from '../lib/response'
import { generateId } from '../lib/id'
import { authMiddleware } from '../middleware/auth'
import { UserRole } from '@crms/types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// All routes require auth
app.use('*', authMiddleware)

// ─── GET /api/timeline/:workItemId ─────────────────────────────────────────────
// Get all timeline tasks for a work item
app.get('/:workItemId', async (c) => {
  const { workItemId } = c.req.param()
  const db = c.get('db')
  const user = c.get('user')!

  // Verify work item exists
  const workItem = await db.query.workItems.findFirst({
    where: eq(schema.workItems.id, workItemId),
    with: {
      department: true,
      vendor: true,
      manager: { columns: { id: true, name: true, avatarUrl: true } },
    },
  })
  if (!workItem) return c.json(err('Work item not found'), 404)

  // business_user can only view their own requests
  if (user.role === UserRole.BUSINESS_USER && workItem.requesterEmail !== user.email) {
    return c.json(err('Not found'), 404)
  }

  const tasks = await db.query.timelineTasks.findMany({
    where: eq(schema.timelineTasks.workItemId, workItemId),
    orderBy: [asc(schema.timelineTasks.sortOrder), asc(schema.timelineTasks.createdAt)],
    with: {
      assignee: { columns: { id: true, name: true, avatarUrl: true } },
      createdBy: { columns: { id: true, name: true } },
    },
  })

  return c.json(ok({ workItem, tasks }))
})

// ─── POST /api/timeline/:workItemId ───────────────────────────────────────────
// Create a new timeline task
const createSchema = z.object({
  label: z.string().min(1).max(200),
  startDate: z.string(),
  endDate: z.string(),
  color: z.enum(['blue', 'green', 'yellow', 'orange', 'red', 'purple']).default('blue'),
  assigneeId: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  notes: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
})

app.post('/:workItemId', zValidator('json', createSchema), async (c) => {
  const { workItemId } = c.req.param()
  const data = c.req.valid('json')
  const db = c.get('db')
  const user = c.get('user')!

  // business_user cannot create
  if (user.role === UserRole.BUSINESS_USER) {
    return c.json(err('Permission denied'), 403)
  }

  const workItem = await db.query.workItems.findFirst({
    where: eq(schema.workItems.id, workItemId),
  })
  if (!workItem) return c.json(err('Work item not found'), 404)

  // Determine sort order (append at end)
  const existing = await db.query.timelineTasks.findMany({
    where: eq(schema.timelineTasks.workItemId, workItemId),
    columns: { sortOrder: true },
  })
  const maxOrder = existing.length > 0
    ? Math.max(...existing.map(t => t.sortOrder))
    : -1

  const id = generateId()
  const task = {
    id,
    workItemId,
    label: data.label,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    color: data.color,
    assigneeId: data.assigneeId ?? null,
    priority: data.priority,
    notes: data.notes ?? null,
    sortOrder: data.sortOrder ?? maxOrder + 1,
    createdBy: user.sub,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.insert(schema.timelineTasks).values(task)

  // Activity log
  await db.insert(schema.activityLogs).values({
    id: generateId(),
    workItemId,
    userId: user.sub,
    action: 'timeline_task_created',
    description: `Timeline task "${data.label}" added`,
    metadata: {
      taskId: id,
      label: data.label,
      startDate: data.startDate,
      endDate: data.endDate,
    },
    createdAt: new Date(),
  })

  // Fetch with relations
  const created = await db.query.timelineTasks.findFirst({
    where: eq(schema.timelineTasks.id, id),
    with: {
      assignee: { columns: { id: true, name: true, avatarUrl: true } },
    },
  })

  return c.json(ok(created, 'Timeline task created'), 201)
})

// ─── PATCH /api/timeline/:workItemId/:taskId ──────────────────────────────────
// Update a timeline task (label, dates, color, etc.)
const updateSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  color: z.enum(['blue', 'green', 'yellow', 'orange', 'red', 'purple']).optional(),
  assigneeId: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  notes: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
})

app.patch('/:workItemId/:taskId', zValidator('json', updateSchema), async (c) => {
  const { workItemId, taskId } = c.req.param()
  const data = c.req.valid('json')
  const db = c.get('db')
  const user = c.get('user')!

  if (user.role === UserRole.BUSINESS_USER) {
    return c.json(err('Permission denied'), 403)
  }

  const task = await db.query.timelineTasks.findFirst({
    where: eq(schema.timelineTasks.id, taskId),
  })
  if (!task || task.workItemId !== workItemId) return c.json(err('Task not found'), 404)

  const oldLabel = task.label
  const oldStart = task.startDate
  const oldEnd = task.endDate

  const updates: Record<string, any> = { updatedAt: new Date() }
  if (data.label !== undefined) updates.label = data.label
  if (data.startDate !== undefined) updates.startDate = new Date(data.startDate)
  if (data.endDate !== undefined) updates.endDate = new Date(data.endDate)
  if (data.color !== undefined) updates.color = data.color
  if ('assigneeId' in data) updates.assigneeId = data.assigneeId ?? null
  if (data.priority !== undefined) updates.priority = data.priority
  if ('notes' in data) updates.notes = data.notes ?? null
  if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder

  await db.update(schema.timelineTasks)
    .set(updates)
    .where(eq(schema.timelineTasks.id, taskId))

  // Build descriptive activity log message
  const changes: string[] = []
  if (data.label && data.label !== oldLabel) changes.push(`label renamed to "${data.label}"`)
  if (data.startDate && new Date(data.startDate).getTime() !== oldStart.getTime()) changes.push(`start date changed`)
  if (data.endDate && new Date(data.endDate).getTime() !== oldEnd.getTime()) changes.push(`end date changed`)
  if (data.color) changes.push(`color changed to ${data.color}`)

  const description = changes.length > 0
    ? `Timeline task "${oldLabel}": ${changes.join(', ')}`
    : `Timeline task "${oldLabel}" updated`

  await db.insert(schema.activityLogs).values({
    id: generateId(),
    workItemId,
    userId: user.sub,
    action: 'timeline_task_updated',
    description,
    metadata: {
      taskId,
      changes: data,
      oldValues: { label: oldLabel, startDate: oldStart, endDate: oldEnd },
    },
    createdAt: new Date(),
  })

  const updated = await db.query.timelineTasks.findFirst({
    where: eq(schema.timelineTasks.id, taskId),
    with: {
      assignee: { columns: { id: true, name: true, avatarUrl: true } },
    },
  })

  return c.json(ok(updated, 'Task updated'))
})

// ─── DELETE /api/timeline/:workItemId/:taskId ──────────────────────────────────
app.delete('/:workItemId/:taskId', async (c) => {
  const { workItemId, taskId } = c.req.param()
  const db = c.get('db')
  const user = c.get('user')!

  if (user.role === UserRole.BUSINESS_USER) {
    return c.json(err('Permission denied'), 403)
  }

  const task = await db.query.timelineTasks.findFirst({
    where: eq(schema.timelineTasks.id, taskId),
  })
  if (!task || task.workItemId !== workItemId) return c.json(err('Task not found'), 404)

  await db.delete(schema.timelineTasks).where(eq(schema.timelineTasks.id, taskId))

  await db.insert(schema.activityLogs).values({
    id: generateId(),
    workItemId,
    userId: user.sub,
    action: 'timeline_task_deleted',
    description: `Timeline task "${task.label}" deleted`,
    metadata: { taskId, label: task.label },
    createdAt: new Date(),
  })

  return c.json(ok(null, 'Task deleted'))
})

// ─── PATCH /api/timeline/:workItemId/reorder ──────────────────────────────────
// Bulk reorder rows
const reorderSchema = z.object({
  order: z.array(z.object({ id: z.string(), sortOrder: z.number().int() })),
})

app.patch('/:workItemId/reorder', zValidator('json', reorderSchema), async (c) => {
  const { workItemId } = c.req.param()
  const { order } = c.req.valid('json')
  const db = c.get('db')
  const user = c.get('user')!

  if (user.role === UserRole.BUSINESS_USER) {
    return c.json(err('Permission denied'), 403)
  }

  await Promise.all(
    order.map(({ id, sortOrder }) =>
      db.update(schema.timelineTasks)
        .set({ sortOrder, updatedAt: new Date() })
        .where(eq(schema.timelineTasks.id, id))
    )
  )

  await db.insert(schema.activityLogs).values({
    id: generateId(),
    workItemId,
    userId: user.sub,
    action: 'timeline_task_reordered',
    description: 'Timeline tasks reordered',
    metadata: { order },
    createdAt: new Date(),
  })

  return c.json(ok(null, 'Reordered'))
})

export default app
