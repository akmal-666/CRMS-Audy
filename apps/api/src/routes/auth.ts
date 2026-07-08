import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import type { Bindings, Variables } from '../types'
import { schema } from '@crms/db'
import { ok, err } from '../lib/response'
import { signJwt } from '../lib/jwt'
import { generateId } from '../lib/id'
import { authMiddleware } from '../middleware/auth'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

app.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')
  const db = c.get('db')

  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, email.toLowerCase()),
  })

  if (!user || !user.isActive) {
    return c.json(err('Invalid email or password'), 401)
  }

  // In production use bcrypt compare - simplified here
  const bcrypt = await import('bcryptjs')
  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) {
    return c.json(err('Invalid email or password'), 401)
  }

  const sessionId = generateId()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await db.insert(schema.sessions).values({
    id: sessionId,
    userId: user.id,
    token: sessionId,
    expiresAt,
    ipAddress: c.req.header('CF-Connecting-IP') || '',
    userAgent: c.req.header('User-Agent') || '',
    createdAt: new Date(),
  })

  const token = await signJwt(
    { sub: user.id, email: user.email, name: user.name, role: user.role as any, sessionId },
    c.env.JWT_SECRET
  )

  // Audit log
  await db.insert(schema.auditLogs).values({
    id: generateId(),
    userId: user.id,
    action: 'login',
    entityType: 'session',
    entityId: sessionId,
    ipAddress: c.req.header('CF-Connecting-IP') || '',
    userAgent: c.req.header('User-Agent') || '',
    createdAt: new Date(),
  })

  c.header('Set-Cookie', `crms_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 3600}`)

  return c.json(ok({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl } }))
})

app.post('/logout', authMiddleware, async (c) => {
  const user = c.get('user')!
  const db = c.get('db')

  await db.delete(schema.sessions).where(eq(schema.sessions.id, user.sessionId))

  await db.insert(schema.auditLogs).values({
    id: generateId(),
    userId: user.sub,
    action: 'logout',
    entityType: 'session',
    entityId: user.sessionId,
    createdAt: new Date(),
  })

  c.header('Set-Cookie', 'crms_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0')
  return c.json(ok(null, 'Logged out successfully'))
})

app.get('/me', authMiddleware, async (c) => {
  const user = c.get('user')!
  const db = c.get('db')

  const dbUser = await db.query.users.findFirst({
    where: eq(schema.users.id, user.sub),
    with: { department: true, branch: true },
  })

  if (!dbUser) return c.json(err('User not found'), 404)

  return c.json(ok({
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    avatarUrl: dbUser.avatarUrl,
    department: dbUser.department,
    branch: dbUser.branch,
  }))
})

export default app
