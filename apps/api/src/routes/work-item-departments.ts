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

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Get collaborating departments for a work item
app.get('/:workItemId/departments', authMiddleware, async (c) => {
  const { workItemId } = c.req.param()
  const db = c.get('db')

  const collabDepts = await db.query.workItemDepartments.findMany({
    where: eq(schema.workItemDepartments.workItemId, workItemId),
    with: {
      department: true,
    },
  })

  return c.json(ok(collabDepts))
})

// Add collaborating department to work item
const addDepartmentSchema = z.object({
  departmentId: z.string().min(1, 'Department ID required'),
})

app.post(
  '/:workItemId/departments',
  authMiddleware,
  requireRole(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.BUSINESS_ANALYST),
  zValidator('json', addDepartmentSchema),
  async (c) => {
    const { workItemId } = c.req.param()
    const { departmentId } = c.req.valid('json')
    const db = c.get('db')
    const user = c.get('user')!

    // Check if work item exists
    const workItem = await db.query.workItems.findFirst({
      where: eq(schema.workItems.id, workItemId),
    })

    if (!workItem) return c.json(err('Work item not found'), 404)

    // Check if department is already the primary department
    if (workItem.departmentId === departmentId) {
      return c.json(err('This is already the primary department'), 400)
    }

    // Check if department already exists as collaborating
    const existing = await db.query.workItemDepartments.findFirst({
      where: and(
        eq(schema.workItemDepartments.workItemId, workItemId),
        eq(schema.workItemDepartments.departmentId, departmentId)
      ),
    })

    if (existing) {
      return c.json(err('Department already added as collaborator'), 400)
    }

    // Add collaborating department
    const id = generateId()
    await db.insert(schema.workItemDepartments).values({
      id,
      workItemId,
      departmentId,
      role: 'collaborating',
      addedBy: user.sub,
      createdAt: new Date(),
    })

    // Activity log
    const dept = await db.query.departments.findFirst({
      where: eq(schema.departments.id, departmentId),
    })

    await db.insert(schema.activityLogs).values({
      id: generateId(),
      workItemId,
      userId: user.sub,
      action: 'department_added',
      description: `Added collaborating department: ${dept?.name ?? departmentId}`,
      createdAt: new Date(),
    })

    return c.json(ok({ id }, 'Collaborating department added'), 201)
  }
)

// Remove collaborating department
app.delete(
  '/:workItemId/departments/:departmentId',
  authMiddleware,
  requireRole(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.BUSINESS_ANALYST),
  async (c) => {
    const { workItemId, departmentId } = c.req.param()
    const db = c.get('db')
    const user = c.get('user')!

    // Find the record
    const record = await db.query.workItemDepartments.findFirst({
      where: and(
        eq(schema.workItemDepartments.workItemId, workItemId),
        eq(schema.workItemDepartments.departmentId, departmentId)
      ),
      with: {
        department: true,
      },
    })

    if (!record) {
      return c.json(err('Collaborating department not found'), 404)
    }

    // Delete
    await db
      .delete(schema.workItemDepartments)
      .where(eq(schema.workItemDepartments.id, record.id))

    // Activity log
    await db.insert(schema.activityLogs).values({
      id: generateId(),
      workItemId,
      userId: user.sub,
      action: 'department_removed',
      description: `Removed collaborating department: ${record.department?.name ?? departmentId}`,
      createdAt: new Date(),
    })

    return c.json(ok(null, 'Collaborating department removed'))
  }
)

export default app
