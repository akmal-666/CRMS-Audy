import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and, desc, inArray } from 'drizzle-orm'
import type { Bindings, Variables } from '../types'
import { schema } from '@crms/db'
import { ok, err } from '../lib/response'
import { generateId } from '../lib/id'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { UserRole } from '@crms/types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// ─── Public route MUST be first, before /:workItemId catches it ───────────────
// Public timeline view (no auth required)
app.get('/public/:token', async (c) => {
  const { token } = c.req.param()
  const db = c.get('db')

  let workItemId: string
  try {
    workItemId = Buffer.from(token, 'base64url').toString('utf-8')
  } catch {
    return c.json(err('Invalid share link'), 400)
  }

  const workItem = await db.query.workItems.findFirst({
    where: eq(schema.workItems.id, workItemId),
    with: { department: true, vendor: true, manager: true, developer: true },
  })

  if (!workItem) return c.json(err('Timeline not found'), 404)

  if (['go_live', 'drop'].includes(workItem.status)) {
    return c.json(err('Timeline no longer available'), 410)
  }

  const tasks = await db.query.timelineTasks.findMany({
    where: eq(schema.timelineTasks.workItemId, workItemId),
    with: { assignee: { columns: { id: true, name: true, avatarUrl: true } } },
    orderBy: [schema.timelineTasks.sortOrder],
  })

  return c.json(ok({ workItem, tasks }))
})

// Get all timeline tasks (for main timeline view)
app.get('/all', authMiddleware, async (c) => {
  const db = c.get('db')
  const user = c.get('user')!

  // Get all timeline tasks with work item info
  const tasks = await db.query.timelineTasks.findMany({
    with: {
      workItem: {
        with: {
          department: true,
          vendor: true,
          manager: true,
          developer: true,
        },
      },
      assignee: { columns: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: [desc(schema.timelineTasks.sortOrder)],
  })

  // Filter based on user role (business_user can only see their items)
  let filteredTasks = tasks
  if (user.role === UserRole.BUSINESS_USER) {
    const userDepartmentId = user.departmentId

    // Get collaborating department work item IDs for this user's department
    let collabWorkItemIds: string[] = []
    if (userDepartmentId) {
      const collabRecords = await db.query.workItemDepartments.findMany({
        where: eq(schema.workItemDepartments.departmentId, userDepartmentId),
        columns: { workItemId: true },
      }).catch(() => [])
      collabWorkItemIds = collabRecords.map(r => r.workItemId)
    }

    filteredTasks = tasks.filter(t => {
      if (!t.workItem) return false
      const isOwnRequest = t.workItem.requesterEmail === user.email
      const isPrimaryDept = userDepartmentId && t.workItem.departmentId === userDepartmentId
      const isCollabDept = collabWorkItemIds.includes(t.workItem.id)
      return isOwnRequest || isPrimaryDept || isCollabDept
    })
  }

  return c.json(ok(filteredTasks))
})

// Get timeline tasks for a specific work item
app.get('/:workItemId', authMiddleware, async (c) => {
  const { workItemId } = c.req.param()
  const db = c.get('db')
  const user = c.get('user')!

  // Check work item access
  const workItem = await db.query.workItems.findFirst({
    where: eq(schema.workItems.id, workItemId),
    with: {
      department: true,
      vendor: true,
      manager: true,
      developer: true,
      qa: true,
      businessAnalyst: true,
    },
  })

  if (!workItem) return c.json(err('Work item not found'), 404)

  // business_user access control — check primary AND collaborating departments
  if (user.role === UserRole.BUSINESS_USER) {
    const isOwnRequest = workItem.requesterEmail === user.email
    const isPrimaryDept = user.departmentId && workItem.departmentId === user.departmentId

    // Check collaborating departments
    let isCollabDept = false
    if (user.departmentId && !isOwnRequest && !isPrimaryDept) {
      const collabRecord = await db.query.workItemDepartments.findFirst({
        where: and(
          eq(schema.workItemDepartments.workItemId, workItem.id),
          eq(schema.workItemDepartments.departmentId, user.departmentId)
        ),
      }).catch(() => null)
      isCollabDept = !!collabRecord
    }

    if (!isOwnRequest && !isPrimaryDept && !isCollabDept) {
      return c.json(err('Work item not found'), 404)
    }
  }

  // Get tasks for this work item
  const tasks = await db.query.timelineTasks.findMany({
    where: eq(schema.timelineTasks.workItemId, workItemId),
    with: {
      assignee: { columns: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: [schema.timelineTasks.sortOrder],
  })

  return c.json(ok({ workItem, tasks }))
})

// Create timeline task
const createTaskSchema = z.object({
  label: z.string().min(1, 'Label is required').max(200),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  color: z.enum(['blue', 'green', 'yellow', 'orange', 'red', 'purple', 'gray']).default('blue'),
  status: z.enum(['not_started', 'in_progress', 'completed', 'on_hold', 'delayed', 'milestone']).default('not_started'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  notes: z.string().optional().nullable(),
  dependsOn: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
})

app.post('/:workItemId', authMiddleware, requireRole(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.BUSINESS_ANALYST, UserRole.DEVELOPER, UserRole.QA, UserRole.VENDOR), zValidator('json', createTaskSchema), async (c) => {
  const { workItemId } = c.req.param()
  const data = c.req.valid('json')
  const db = c.get('db')
  const user = c.get('user')!

  // Verify work item exists
  const workItem = await db.query.workItems.findFirst({
    where: eq(schema.workItems.id, workItemId),
  })

  if (!workItem) return c.json(err('Work item not found'), 404)

  // Get next sort order
  const existingTasks = await db.query.timelineTasks.findMany({
    where: eq(schema.timelineTasks.workItemId, workItemId),
    orderBy: [desc(schema.timelineTasks.sortOrder)],
    limit: 1,
  })

  const nextSortOrder = existingTasks.length > 0 ? (existingTasks[0].sortOrder ?? 0) + 1 : 0

  const id = generateId()

  await db.insert(schema.timelineTasks).values({
    id,
    workItemId,
    label: data.label,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    color: data.color,
    status: data.status,
    priority: data.priority,
    notes: data.notes || null,
    dependsOn: data.dependsOn || null,
    assigneeId: data.assigneeId || null,
    sortOrder: nextSortOrder,
    createdBy: user.sub,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // Activity log
  await db.insert(schema.activityLogs).values({
    id: generateId(),
    workItemId,
    userId: user.sub,
    action: 'timeline_task_created',
    description: `Timeline task "${data.label}" created`,
    createdAt: new Date(),
  })

  return c.json(ok({ id }, 'Task created'), 201)
})

// Update timeline task
const updateTaskSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  color: z.enum(['blue', 'green', 'yellow', 'orange', 'red', 'purple', 'gray']).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'on_hold', 'delayed', 'milestone']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  notes: z.string().optional().nullable(),
  dependsOn: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
})

app.patch('/:workItemId/:taskId', authMiddleware, requireRole(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.BUSINESS_ANALYST, UserRole.DEVELOPER, UserRole.QA, UserRole.VENDOR), zValidator('json', updateTaskSchema), async (c) => {
  const { workItemId, taskId } = c.req.param()
  const data = c.req.valid('json')
  const db = c.get('db')
  const user = c.get('user')!

  // Verify task exists
  const task = await db.query.timelineTasks.findFirst({
    where: and(
      eq(schema.timelineTasks.id, taskId),
      eq(schema.timelineTasks.workItemId, workItemId)
    ),
  })

  if (!task) return c.json(err('Task not found'), 404)

  // Build update object
  const updateData: any = { updatedAt: new Date() }
  if (data.label !== undefined) updateData.label = data.label
  if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate)
  if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate)
  if (data.color !== undefined) updateData.color = data.color
  if (data.status !== undefined) updateData.status = data.status
  if (data.priority !== undefined) updateData.priority = data.priority
  if (data.notes !== undefined) updateData.notes = data.notes
  if (data.dependsOn !== undefined) updateData.dependsOn = data.dependsOn
  if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

  await db.update(schema.timelineTasks)
    .set(updateData)
    .where(eq(schema.timelineTasks.id, taskId))

  // Activity log
  await db.insert(schema.activityLogs).values({
    id: generateId(),
    workItemId,
    userId: user.sub,
    action: 'timeline_task_updated',
    description: `Timeline task "${task.label}" updated`,
    createdAt: new Date(),
  })

  return c.json(ok({ id: taskId }, 'Task updated'))
})

// Delete timeline task
app.delete('/:workItemId/:taskId', authMiddleware, requireRole(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.BUSINESS_ANALYST, UserRole.DEVELOPER, UserRole.QA, UserRole.VENDOR), async (c) => {
  const { workItemId, taskId } = c.req.param()
  const db = c.get('db')
  const user = c.get('user')!

  // Verify task exists
  const task = await db.query.timelineTasks.findFirst({
    where: and(
      eq(schema.timelineTasks.id, taskId),
      eq(schema.timelineTasks.workItemId, workItemId)
    ),
  })

  if (!task) return c.json(err('Task not found'), 404)

  await db.delete(schema.timelineTasks)
    .where(eq(schema.timelineTasks.id, taskId))

  // Activity log
  await db.insert(schema.activityLogs).values({
    id: generateId(),
    workItemId,
    userId: user.sub,
    action: 'timeline_task_deleted',
    description: `Timeline task "${task.label}" deleted`,
    createdAt: new Date(),
  })

  return c.json(ok(null, 'Task deleted'))
})

// Generate share token for public timeline view
app.post('/:workItemId/share', authMiddleware, async (c) => {
  const { workItemId } = c.req.param()
  const db = c.get('db')

  // Verify work item exists
  const workItem = await db.query.workItems.findFirst({
    where: eq(schema.workItems.id, workItemId),
  })

  if (!workItem) return c.json(err('Work item not found'), 404)

  // Generate token (simple: use workItemId as token for now, can be enhanced with JWT)
  const token = Buffer.from(workItemId).toString('base64url')

  return c.json(ok({ token }, 'Share link generated'))
})

// Reorder tasks (drag & drop)
const reorderSchema = z.object({
  order: z.array(z.object({ id: z.string(), sortOrder: z.number() })).min(1, 'Order array required'),
})

app.patch('/:workItemId/reorder', authMiddleware, requireRole(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.BUSINESS_ANALYST, UserRole.DEVELOPER, UserRole.QA, UserRole.VENDOR), zValidator('json', reorderSchema), async (c) => {
  const { workItemId } = c.req.param()
  const { order } = c.req.valid('json')
  const db = c.get('db')

  // Update sort orders
  await Promise.all(
    order.map(({ id, sortOrder }) =>
      db.update(schema.timelineTasks)
        .set({ sortOrder, updatedAt: new Date() })
        .where(and(
          eq(schema.timelineTasks.id, id),
          eq(schema.timelineTasks.workItemId, workItemId)
        ))
    )
  )

  return c.json(ok(null, 'Tasks reordered'))
})

export default app
