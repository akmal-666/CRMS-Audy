import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, like, and, desc, sql, count, inArray } from 'drizzle-orm'
import type { Bindings, Variables } from '../types'
import { schema } from '@crms/db'
import { ok, err, paginate } from '../lib/response'
import { generateId, generateTicketNumber } from '../lib/id'
import { authMiddleware } from '../middleware/auth'
import { requireRole, MANAGER_ROLES, ASSIGNMENT_ROLES, STAFF_ROLES } from '../middleware/rbac'
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

  // Generate ticket number with robust counter handling
  const year = new Date().getFullYear()
  let counter = 1
  try {
    const counterResult = await c.env.DB.prepare(
      'UPDATE ticket_counters SET counter = counter + 1 WHERE year = ? RETURNING counter'
    ).bind(year).first<{ counter: number }>()

    if (counterResult) {
      counter = counterResult.counter
    } else {
      // Row doesn't exist yet — insert it
      await c.env.DB.prepare(
        'INSERT OR IGNORE INTO ticket_counters (year, counter) VALUES (?, 1)'
      ).bind(year).run()
      counter = 1
    }
  } catch {
    // Fallback: use timestamp-based counter if D1 raw query fails
    counter = Date.now() % 10000
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

// Public: Track requests by email or ticket number
app.get('/public/track', zValidator('query', z.object({ query: z.string().min(3) })), async (c) => {
  const { query } = c.req.valid('query')
  const db = c.get('db')
  
  const isEmail = query.includes('@')
  
  const items = await db.query.workItems.findMany({
    where: isEmail 
      ? eq(schema.workItems.requesterEmail, query)
      : like(schema.workItems.ticketNumber, `%${query}%`),
    orderBy: [desc(schema.workItems.createdAt)],
    with: {
      department: true,
      vendor: true,
      manager: { columns: { name: true } },
    }
  })
  
  return c.json(ok(items))
})

// Authenticated: Submit request (for logged-in users)
app.post('/', authMiddleware, zValidator('json', submitSchema), async (c) => {
  const data = c.req.valid('json')
  const user = c.get('user')!
  const db = c.get('db')

  // Generate ticket number with robust counter handling
  const year = new Date().getFullYear()
  let counter = 1
  try {
    const counterResult = await c.env.DB.prepare(
      'UPDATE ticket_counters SET counter = counter + 1 WHERE year = ? RETURNING counter'
    ).bind(year).first<{ counter: number }>()

    if (counterResult) {
      counter = counterResult.counter
    } else {
      // Row doesn't exist yet — insert it
      await c.env.DB.prepare(
        'INSERT OR IGNORE INTO ticket_counters (year, counter) VALUES (?, 1)'
      ).bind(year).run()
      counter = 1
    }
  } catch {
    // Fallback: use timestamp-based counter if D1 raw query fails
    counter = Date.now() % 10000
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
    createdBy: user.sub, // Track who created it
  })

  // Activity log
  await db.insert(schema.activityLogs).values({
    id: generateId(),
    workItemId: id,
    userId: user.sub,
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

// Get work items (authenticated)
app.get('/', authMiddleware, async (c) => {
  const db = c.get('db')
  const user = c.get('user')!
  const { page = '1', pageSize = '20', search, status, priority, departmentId, assignee, vendorId } = c.req.query()

  const pageNum = parseInt(page)
  // Allow higher pageSize for staff roles (BA, Manager, Admin) for kanban view
  const isStaff = [UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.BUSINESS_ANALYST].includes(user.role as UserRole)
  const maxPageSize = isStaff ? 500 : 100
  const pageSizeNum = Math.min(parseInt(pageSize), maxPageSize)
  const offset = (pageNum - 1) * pageSizeNum

  const conditions: any[] = []

  // business_user can only see requests from their email OR their department
  if (user.role === UserRole.BUSINESS_USER) {
    const userDepartmentId = user.departmentId
    
    if (userDepartmentId) {
      // Can see: own requests OR requests from same department
      conditions.push(
        sql`(${schema.workItems.requesterEmail} = ${user.email} OR ${schema.workItems.departmentId} = ${userDepartmentId})`
      )
    } else {
      // Fallback: only own requests if no department assigned
      conditions.push(eq(schema.workItems.requesterEmail, user.email))
    }
  }

  if (search) {
    conditions.push(
      sql`(${schema.workItems.ticketNumber} LIKE ${'%' + search + '%'} OR ${schema.workItems.title} LIKE ${'%' + search + '%'} OR ${schema.workItems.requesterName} LIKE ${'%' + search + '%'})`
    )
  }
  if (status) conditions.push(eq(schema.workItems.status, status as any))
  if (priority) conditions.push(eq(schema.workItems.priority, priority as any))
  if (departmentId) conditions.push(eq(schema.workItems.departmentId, departmentId))
  if (vendorId) conditions.push(eq(schema.workItems.vendorId, vendorId))

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
        businessAnalyst: { columns: { id: true, name: true, avatarUrl: true } },
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
  const user = c.get('user')!
  const db = c.get('db')

  try {
    // Step 1: Fetch core work item with safe relations only
    const item = await db.query.workItems.findFirst({
      where: eq(schema.workItems.id, id),
      with: {
        department: true,
        vendor: true,
        manager: true,
        businessAnalyst: true,
        developer: true,
        qa: true,
      },
    })

    if (!item) return c.json(err('Work item not found'), 404)

    // business_user can only access requests from their email OR their department
    if (user.role === UserRole.BUSINESS_USER) {
      const isOwnRequest = item.requesterEmail === user.email
      const isSameDepartment = user.departmentId && item.departmentId === user.departmentId
      if (!isOwnRequest && !isSameDepartment) {
        return c.json(err('Work item not found'), 404)
      }
    }

    // Step 2: Fetch each optional relation separately with individual try-catch
    // This way if any table doesn't exist, other data still loads
    const [comments, attachments, activityLogs, assessment, tasks, deployments] = await Promise.all([
      db.query.comments.findMany({
        where: eq(schema.comments.workItemId, id),
        with: { user: { columns: { id: true, name: true, avatarUrl: true, role: true } } },
        orderBy: [desc(schema.comments.createdAt)],
      }).catch(() => []),

      db.query.attachments.findMany({
        where: eq(schema.attachments.workItemId, id),
        with: { uploader: { columns: { id: true, name: true } } },
      }).catch(() => []),

      db.query.activityLogs.findMany({
        where: eq(schema.activityLogs.workItemId, id),
        with: { user: { columns: { id: true, name: true, avatarUrl: true } } },
        orderBy: [desc(schema.activityLogs.createdAt)],
      }).catch(() => []),

      db.query.assessments.findFirst({
        where: eq(schema.assessments.workItemId, id),
      }).catch(() => null),

      db.query.tasks.findMany({
        where: eq(schema.tasks.workItemId, id),
        with: { assignee: true, subtasks: true },
      }).catch(() => []),

      db.query.deployments.findMany({
        where: eq(schema.deployments.workItemId, id),
      }).catch(() => []),
    ])

    return c.json(ok({
      ...item,
      comments,
      attachments,
      activityLogs,
      assessment,
      tasks,
      deployments,
    }))
  } catch (error) {
    console.error('[work-items/:id] Error:', error)
    return c.json(err(`Failed to fetch work item: ${error instanceof Error ? error.message : String(error)}`), 500)
  }
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

app.patch('/:id/assign', authMiddleware, requireRole(...ASSIGNMENT_ROLES), zValidator('json', assignSchema), async (c) => {
  const { id } = c.req.param()
  const data = c.req.valid('json')
  const user = c.get('user')!
  const db = c.get('db')

  // Get work item details
  const workItem = await db.query.workItems.findFirst({
    where: eq(schema.workItems.id, id),
    columns: { id: true, ticketNumber: true, title: true },
  })

  if (!workItem) return c.json(err('Work item not found'), 404)

  // Update assignments
  await db.update(schema.workItems)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.workItems.id, id))

  // Create activity log
  await db.insert(schema.activityLogs).values({
    id: generateId(),
    workItemId: id,
    userId: user.sub,
    action: 'assigned',
    description: 'Team assignment updated',
    metadata: data,
    createdAt: new Date(),
  })

  // Create notifications for newly assigned users
  const notifications: Array<{
    id: string
    userId: string
    type: 'assignment'
    title: string
    message: string
    workItemId: string
    isRead: boolean
    createdAt: Date
  }> = []

  const roleLabels = {
    managerId: 'Manager',
    businessAnalystId: 'Business Analyst',
    developerId: 'Developer',
    qaId: 'QA',
  }

  for (const [field, userId] of Object.entries(data)) {
    if (userId && (field === 'managerId' || field === 'businessAnalystId' || field === 'developerId' || field === 'qaId')) {
      const roleLabel = roleLabels[field as keyof typeof roleLabels]
      notifications.push({
        id: generateId(),
        userId: userId as string,
        type: 'assignment',
        title: 'You have been assigned to a CR',
        message: `You have been assigned as ${roleLabel} to ${workItem.ticketNumber}: ${workItem.title}`,
        workItemId: id,
        isRead: false,
        createdAt: new Date(),
      })
    }
  }

  if (notifications.length > 0) {
    await db.insert(schema.notifications).values(notifications)
  }

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

// Update work item details (Administrator only)
const updateDetailsSchema = z.object({
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  dueDate: z.string().optional(),
  departmentId: z.string().optional(),
  vendorId: z.string().optional(),
  createdAt: z.string().optional(),
})

app.patch('/:id', authMiddleware, requireRole(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.BUSINESS_ANALYST), zValidator('json', updateDetailsSchema), async (c) => {
  const { id } = c.req.param()
  const data = c.req.valid('json')
  const user = c.get('user')!
  const db = c.get('db')

  const item = await db.query.workItems.findFirst({ where: eq(schema.workItems.id, id) })
  if (!item) return c.json(err('Work item not found'), 404)

  // Build update object
  const updateData: any = { updatedAt: new Date() }
  if (data.priority) updateData.priority = data.priority
  if (data.dueDate) updateData.dueDate = new Date(data.dueDate)
  if (data.departmentId) updateData.departmentId = data.departmentId
  if (data.vendorId) updateData.vendorId = data.vendorId
  if (data.createdAt) updateData.createdAt = new Date(data.createdAt)

  await db.update(schema.workItems)
    .set(updateData)
    .where(eq(schema.workItems.id, id))

  await db.insert(schema.activityLogs).values({
    id: generateId(),
    workItemId: id,
    userId: user.sub,
    action: 'updated',
    description: 'Work item details updated',
    metadata: data,
    createdAt: new Date(),
  })

  await db.insert(schema.auditLogs).values({
    id: generateId(),
    userId: user.sub,
    action: 'update',
    entityType: 'work_item',
    entityId: id,
    oldValues: {
      priority: item.priority,
      dueDate: item.dueDate,
      departmentId: item.departmentId,
      vendorId: item.vendorId,
      createdAt: item.createdAt,
    },
    newValues: data,
    createdAt: new Date(),
  })

  return c.json(ok({ id }, 'Work item updated successfully'))
})

// Delete work item (Administrator only)
app.delete('/:id', authMiddleware, requireRole(UserRole.ADMINISTRATOR), async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')!
  const db = c.get('db')

  // Check if work item exists
  const item = await db.query.workItems.findFirst({ where: eq(schema.workItems.id, id) })
  if (!item) return c.json(err('Work item not found'), 404)

  // Store info for audit log before deletion
  const ticketNumber = item.ticketNumber
  const title = item.title

  // Delete related records first (cascade)
  await Promise.all([
    db.delete(schema.comments).where(eq(schema.comments.workItemId, id)),
    db.delete(schema.attachments).where(eq(schema.attachments.workItemId, id)),
    db.delete(schema.activityLogs).where(eq(schema.activityLogs.workItemId, id)),
    db.delete(schema.tasks).where(eq(schema.tasks.workItemId, id)),
    db.delete(schema.assessments).where(eq(schema.assessments.workItemId, id)),
    db.delete(schema.deployments).where(eq(schema.deployments.workItemId, id)),
  ])

  // Delete the work item
  await db.delete(schema.workItems).where(eq(schema.workItems.id, id))

  // Audit log
  await db.insert(schema.auditLogs).values({
    id: generateId(),
    userId: user.sub,
    action: 'delete',
    entityType: 'work_item',
    entityId: id,
    oldValues: { ticketNumber, title },
    newValues: null,
    createdAt: new Date(),
  })

  return c.json(ok(null, 'Work item deleted successfully'))
})

export default app
