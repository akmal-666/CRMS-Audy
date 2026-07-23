import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, count, desc } from 'drizzle-orm'
import type { Bindings, Variables } from '../types'
import { schema } from '@crms/db'
import { ok, err, paginate } from '../lib/response'
import { generateId } from '../lib/id'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { UserRole } from '@crms/types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole),
  departmentId: z.string().optional(),
  branchId: z.string().optional(),
})

app.get('/', authMiddleware, requireRole(UserRole.ADMINISTRATOR, UserRole.MANAGER), async (c) => {
  const db = c.get('db')
  const { page = '1', pageSize = '20' } = c.req.query()

  const pageNum = parseInt(page)
  const pageSizeNum = parseInt(pageSize)
  const offset = (pageNum - 1) * pageSizeNum

  const [users, totalResult] = await Promise.all([
    db.query.users.findMany({
      limit: pageSizeNum,
      offset,
      orderBy: [desc(schema.users.createdAt)],
      with: { department: true, branch: true },
      columns: { passwordHash: false },
    }),
    db.select({ count: count() }).from(schema.users),
  ])

  return c.json(paginate(users, totalResult[0]?.count ?? 0, pageNum, pageSizeNum))
})

app.post('/', authMiddleware, requireRole(UserRole.ADMINISTRATOR), zValidator('json', createUserSchema), async (c) => {
  const data = c.req.valid('json')
  const db = c.get('db')

  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, data.email.toLowerCase()) })
  if (existing) return c.json(err('Email already exists'), 409)

  const bcrypt = await import('bcryptjs')
  const passwordHash = await bcrypt.hash(data.password, 12)

  const id = generateId()
  await db.insert(schema.users).values({
    id,
    email: data.email.toLowerCase(),
    name: data.name,
    passwordHash,
    role: data.role,
    departmentId: data.departmentId,
    branchId: data.branchId,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  return c.json(ok({ id }, 'User created'), 201)
})

app.patch('/:id', authMiddleware, requireRole(UserRole.ADMINISTRATOR), async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json()
  const db = c.get('db')

  // If password is provided, hash it
  if (body.password && body.password.length > 0) {
    const bcrypt = await import('bcryptjs')
    body.passwordHash = await bcrypt.hash(body.password, 12)
    delete body.password
  } else {
    // Remove password field if empty
    delete body.password
  }

  await db.update(schema.users).set({ ...body, updatedAt: new Date() }).where(eq(schema.users.id, id))
  return c.json(ok(null, 'User updated'))
})

app.delete('/:id', authMiddleware, requireRole(UserRole.ADMINISTRATOR), async (c) => {
  const { id } = c.req.param()
  const db = c.get('db')

  await db.update(schema.users).set({ isActive: false, updatedAt: new Date() }).where(eq(schema.users.id, id))
  return c.json(ok(null, 'User deactivated'))
})

export default app
