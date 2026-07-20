import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import type { Bindings, Variables } from '../types'
import { schema } from '@crms/db'
import { ok } from '../lib/response'
import { generateId } from '../lib/id'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { UserRole } from '@crms/types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Departments
app.get('/departments', async (c) => {
  const db = c.get('db')
  const departments = await db.query.departments.findMany({ where: eq(schema.departments.isActive, true) })
  return c.json(ok(departments))
})

app.post('/departments', authMiddleware, requireRole(UserRole.ADMINISTRATOR), zValidator('json', z.object({ name: z.string(), code: z.string() })), async (c) => {
  const data = c.req.valid('json')
  const db = c.get('db')
  const id = generateId()
  await db.insert(schema.departments).values({ id, ...data, createdAt: new Date(), updatedAt: new Date() })
  return c.json(ok({ id }, 'Department created'), 201)
})

app.put('/departments/:id', authMiddleware, requireRole(UserRole.ADMINISTRATOR), async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json()
  const db = c.get('db')
  await db.update(schema.departments).set({ ...body, updatedAt: new Date() }).where(eq(schema.departments.id, id))
  return c.json(ok(null, 'Department updated'))
})

app.delete('/departments/:id', authMiddleware, requireRole(UserRole.ADMINISTRATOR), async (c) => {
  const { id } = c.req.param()
  const db = c.get('db')
  await db.delete(schema.departments).where(eq(schema.departments.id, id))
  return c.json(ok(null, 'Department deleted'))
})

// Branches
app.get('/branches', async (c) => {
  const db = c.get('db')
  const departmentId = c.req.query('departmentId')
  const branches = await db.query.branches.findMany({
    where: departmentId ? eq(schema.branches.departmentId, departmentId) : eq(schema.branches.isActive, true),
  })
  return c.json(ok(branches))
})

app.post('/branches', authMiddleware, requireRole(UserRole.ADMINISTRATOR), zValidator('json', z.object({ name: z.string(), code: z.string(), departmentId: z.string().optional() })), async (c) => {
  const data = c.req.valid('json')
  const db = c.get('db')
  const id = generateId()
  await db.insert(schema.branches).values({ id, ...data, createdAt: new Date(), updatedAt: new Date() })
  return c.json(ok({ id }, 'Branch created'), 201)
})

app.put('/branches/:id', authMiddleware, requireRole(UserRole.ADMINISTRATOR), async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json()
  const db = c.get('db')
  await db.update(schema.branches).set({ ...body, updatedAt: new Date() }).where(eq(schema.branches.id, id))
  return c.json(ok(null, 'Branch updated'))
})

app.delete('/branches/:id', authMiddleware, requireRole(UserRole.ADMINISTRATOR), async (c) => {
  const { id } = c.req.param()
  const db = c.get('db')
  await db.delete(schema.branches).where(eq(schema.branches.id, id))
  return c.json(ok(null, 'Branch deleted'))
})

// Vendors
app.get('/vendors', async (c) => {
  const db = c.get('db')
  const vendors = await db.query.vendors.findMany({ where: eq(schema.vendors.isActive, true) })
  return c.json(ok(vendors))
})

app.post('/vendors', authMiddleware, requireRole(UserRole.ADMINISTRATOR), async (c) => {
  const body = await c.req.json()
  const db = c.get('db')
  const id = generateId()
  await db.insert(schema.vendors).values({ id, ...body, createdAt: new Date(), updatedAt: new Date() })
  return c.json(ok({ id }, 'Vendor created'), 201)
})

app.put('/vendors/:id', authMiddleware, requireRole(UserRole.ADMINISTRATOR), async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json()
  const db = c.get('db')
  await db.update(schema.vendors).set({ ...body, updatedAt: new Date() }).where(eq(schema.vendors.id, id))
  return c.json(ok(null, 'Vendor updated'))
})

app.delete('/vendors/:id', authMiddleware, requireRole(UserRole.ADMINISTRATOR), async (c) => {
  const { id } = c.req.param()
  const db = c.get('db')
  await db.delete(schema.vendors).where(eq(schema.vendors.id, id))
  return c.json(ok(null, 'Vendor deleted'))
})

export default app
