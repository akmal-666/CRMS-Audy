import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, like, and, desc, sql, count, inArray } from 'drizzle-orm'
import type { Bindings, Variables } from '../types'
import { schema } from '@crms/db'
import { ok, err, paginate } from '../lib/response'
import { generateId, generateTicketNumber } from '../lib/id'
import { authMiddleware } from '../middleware/auth'
import { requireRole, MANAGER_ROLES, STAFF_ROLES } from '../middleware/rbac'
import { UserRole, WorkflowStatus } from '@crms/types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Public: Submit request
const submitSchema = z.object({
  requesterName: z.string().min(2).max(100),
  requesterEmail: z.string().email(),
  departmentId: z.string(),
  managerEmail: z.string().email(),
  title: z.string().min(5).max(200),
  problemDescription: z.string().min(10),
  expectedSolution: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  dueDate: z.string().min(1),
  vendorId: z.string().min(1),
})

app.post('/public/submit', zValidator('json', submitSchema), async (c) => {
  const data = c.req.valid('json')
  const db = c.get('db')

  // Generate ticket number
  const year = new Date().getFullYear()
  const counterResult = await c.env.DB.prepare(
    'UPDATE ticket_counters SET counter = counter + 1 WHERE year = ? RETURNING counter'
  ).bind(year).first<{ counter: number }>()

  let counter = 1
  if (counterResult) {
    counter = counterResult.counter
  } else {
    await c.env.DB.prepare(
      'INSERT INTO ticket_counters (year, counter) VALUES (?, 1)'
    ).bind(year).run()
  }

  const ticketNumber = generateTicketNumber(year, counter)
  const id = generateId()

  await db.insert(schema.workItems).values({
    id,
    ticketNumber,
    title: data.title,
    description: data.problemDescription,
    problemDescription: data.problemDescription,
    expectedSolution: data.expectedSolution,
    departmentId: data.departmentId,
    vendorId: data.vendorId,
    managerEmail: data.managerEmail,
    priority: data.priority as any,
    status: 'in_pipeline',
    requesterName: data.requesterName,
    requesterEmail: data.requesterEmail,
    dueDate: new Date(data.dueDate),
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // Activity log
  await db.insert(schema.activityLogs).values({
    id: generateId(),
    workItemId: id,
    guestName: data.requesterName,
    action: 'created',
    description: `Request submitted by ${data.requesterName}`,
    createdAt: new Date(),
  })

  // Queue confirmation email
  try {
    await c.env.EMAIL_QUEUE.send({
      type: 'confirmation',
      to: data.requesterEmail,
      name: data.requesterName,
      ticketNumber,
      title: data.title,
      workItemId: id,
      role: 'requester'
    })

    if (data.managerEmail) {
      await c.env.EMAIL_QUEUE.send({
        type: 'confirmation',
        to: data.managerEmail,
        name: 'Manager',
        ticketNumber,
        title: `(Manager FYI) ${data.title}`,
        workItemId: id,
        role: 'manager'
      })
    }
  } catch { /* email queue optional */ }

  return c.json(ok({ ticketNumber, id }, 'Request submitted successfully'), 201)
})

// Public: Track requests by email
app.get('/public/track', zValidator('query', z.object({ email: z.string().email() })), async (c) => {
  const { email } = c.req.valid('query')
  const db = c.get('db')
  
  const items = await db.query.workItems.findMany({
    where: eq(schema.workItems.requesterEmail, email),
    orderBy: [desc(schema.workItems.createdAt)],
    with: {
      department: true,
      vendor: true,
      manager: { columns: { name: true } },
    }
  })
  
  return c.json(ok(items))
})

// Get work items (authenticated)
app.get('/', authMiddleware, async (c) => {
  const db = c.get('db')
  const { page = '1', pageSize = '20', search, status, priority, departmentId, assignee } = c.req.query()

  const pageNum = parseInt(page)
  const pageSizeNum = Math.min(parseInt(pageSize), 100)
  const offset = (pageNum - 1) * pageSizeNum

  const conditions: any[] = []
  if (search) {
    conditions.push(
      sql`(${schema.workItems.ticketNumber} LIKE ${'%' + search + '%'} OR ${schema.workItems.title} LIKE ${'%' + search + '%'} OR ${schema.workItems.requesterName} LIKE ${'%' + search + '%'})`
    )
  }
  if (status) conditions.push(eq(schema.workItems.status, status as any))
  if (priority) conditions.push(eq(schema.workItems.priority, priority as any))
  if (departmentId) conditions.push(eq(schema.workItems.departmentId, departmentId))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [items, totalResult] = await Promise.all([
    db.query.workItems.findMany({
      where,
      limit: pageSizeNum,
      offset,
      orderBy: [desc(schema.workItems.createdAt)],
      with: {
        department: true,
        manager: { columns: { id: true, name: true, avatarUrl: true } },
        developer: { columns: { id: true, name: true, avatarUrl: true } },
        vendor: { columns: { id: true, name: true } },
      },
    }),
    db.select({ count: count() }).from(schema.workItems).where(where),
  ])

  const total = totalResult[0]?.count ?? 0
  return c.json(paginate(items, total, pageNum, pageSizeNum))
})

// Get single work item
app.get('/:id', authMiddleware, async (c) => {
  const { id } = c.req.param()
  const db = c.get('db')

  const item = await db.query.workItems.findFirst({
    where: eq(schema.workItems.id, id),
    with: {
      department: true,
      manager: true,
      businessAnalyst: true,
      vendor: true,
      developer: true,
      qa: true,
      assessment: true,
      tasks: { with: { subtasks: true, assignee: true } },
      comments: { with: { user: { columns: { id: true, name: true, avatarUrl: true, role: true } } }, orderBy: [desc(schema.comments.createdAt)] },
      attachments: { with: { uploader: { columns: { id: true, name: true } } } },
      activityLogs: { with: { user: { columns: { id: true, name: true, avatarUrl: true } } }, orderBy: [desc(schema.activityLogs.createdAt)] },
      deployments: true,
    },
  })

  if (!item) return c.json(err('Work item not found'), 404)
  return c.json(ok(item))
})

// Update status
const updateStatusSchema = z.object({
  status: z.enum(['in_pipeline', 'assessment', 'development', 'uat', 'deployment', 'go_live', 'drop']),
})

app.patch('/:id/status', authMiddleware, requireRole(...STAFF_ROLES), zValidator('json', updateStatusSchema), async (c) => {
  const { id } = c.req.param()
  const { status } = c.req.valid('json')
  const user = c.get('user')!
  const db = c.get('db')

  const item = await db.query.workItems.findFirst({ where: eq(schema.workItems.id, id) })
  if (!item) return c.json(err('Work item not found'), 404)

  const oldStatus = item.status
  const goLiveDate = status === 'go_live' && oldStatus !== 'go_live' ? new Date() : undefined

  await db.update(schema.workItems)
    .set({ 
      status: status as any, 
      updatedAt: new Date(),
      ...(goLiveDate && { goLiveDate })
    })
    .where(eq(schema.workItems.id, id))

  await Promise.all([
    db.insert(schema.activityLogs).values({
      id: generateId(),
      workItemId: id,
      userId: user.sub,
      action: 'status_changed',
      description: `Status changed from ${oldStatus} to ${status}`,
      metadata: { oldStatus, newStatus: status },
      createdAt: new Date(),
    }),
    db.insert(schema.auditLogs).values({
      id: generateId(),
      userId: user.sub,
      action: 'status_change',
      entityType: 'work_item',
      entityId: id,
      oldValues: { status: oldStatus },
      newValues: { status },
      createdAt: new Date(),
    }),
  ])

  return c.json(ok({ id, status }, 'Status updated'))
})

// Assign team
const assignSchema = z.object({
  managerId: z.string().optional().nullable(),
  businessAnalystId: z.string().optional().nullable(),
  vendorId: z.string().optional().nullable(),
  developerId: z.string().optional().nullable(),
  qaId: z.string().optional().nullable(),
})

app.patch('/:id/assign', authMiddleware, requireRole(...MANAGER_ROLES), zValidator('json', assignSchema), async (c) => {
  const { id } = c.req.param()
  const data = c.req.valid('json')
  const user = c.get('user')!
  const db = c.get('db')

  await db.update(schema.workItems)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.workItems.id, id))

  await db.insert(schema.activityLogs).values({
    id: generateId(),
    workItemId: id,
    userId: user.sub,
    action: 'assigned',
    description: 'Team assignment updated',
    metadata: data,
    createdAt: new Date(),
  })

  return c.json(ok(null, 'Assignment updated'))
})

// Update assessment
const assessmentSchema = z.object({
  estimatedManDays: z.number().positive().optional(),
  estimatedHours: z.number().positive().optional(),
  targetGoLive: z.string().datetime().optional(),
  complexity: z.enum(['low', 'medium', 'high']).optional(),
  risk: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  impact: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  technicalNotes: z.string().optional(),
})

app.put('/:id/assessment', authMiddleware, requireRole(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.BUSINESS_ANALYST, UserRole.VENDOR), zValidator('json', assessmentSchema), async (c) => {
  const { id } = c.req.param()
  const data = c.req.valid('json')
  const user = c.get('user')!
  const db = c.get('db')

  const existing = await db.query.assessments.findFirst({ where: eq(schema.assessments.workItemId, id) })

  if (existing) {
    await db.update(schema.assessments).set({ ...data, targetGoLive: data.targetGoLive ? new Date(data.targetGoLive) : undefined, updatedAt: new Date() }).where(eq(schema.assessments.workItemId, id))
  } else {
    await db.insert(schema.assessments).values({
      id: generateId(),
      workItemId: id,
      ...data,
      targetGoLive: data.targetGoLive ? new Date(data.targetGoLive) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  await db.insert(schema.activityLogs).values({
    id: generateId(),
    workItemId: id,
    userId: user.sub,
    action: 'assessment_updated',
    description: 'Assessment updated',
    createdAt: new Date(),
  })

  return c.json(ok(null, 'Assessment updated'))
})

// Update mandays
const updateMandaysSchema = z.object({
  mandays: z.number().nullable(),
})

app.patch('/:id/mandays', authMiddleware, requireRole(...STAFF_ROLES), zValidator('json', updateMandaysSchema), async (c) => {
  const { id } = c.req.param()
  const { mandays } = c.req.valid('json')
  const db = c.get('db')
  const user = c.get('user')!

  const item = await db.query.workItems.findFirst({ where: eq(schema.workItems.id, id) })
  if (!item) return c.json(err('Work item not found'), 404)

  const oldMandays = item.mandays

  await db.update(schema.workItems)
    .set({ mandays, updatedAt: new Date() })
    .where(eq(schema.workItems.id, id))

  await db.insert(schema.auditLogs).values({
    id: generateId(),
    userId: user.sub,
    action: 'update',
    entityType: 'work_item',
    entityId: id,
    oldValues: { mandays: oldMandays },
    newValues: { mandays },
    createdAt: new Date(),
  })

  return c.json(ok({ id, mandays }, 'Mandays updated'))
})

export default app
