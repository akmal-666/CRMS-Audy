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

// ─── Forgot Password ──────────────────────────────────────────────────────────
app.post('/forgot-password', zValidator('json', z.object({ email: z.string().email() })), async (c) => {
  const { email } = c.req.valid('json')
  const db = c.get('db')

  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, email.toLowerCase()),
  })

  // Always return success to prevent user enumeration
  if (!user || !user.isActive) {
    return c.json(ok(null, 'If that email exists, a reset link has been sent.'))
  }

  // Generate a secure reset token and store it in KV with 1-hour TTL
  const token = generateId() + generateId() // 42-char random token
  const kvKey = `pwd_reset:${token}`
  await c.env.CACHE.put(kvKey, user.id, { expirationTtl: 3600 })

  const appUrl = c.env.APP_URL || 'http://localhost:3000'
  const resetUrl = `${appUrl}/reset-password?token=${token}`

  // Send reset email via Resend
  if (c.env.RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CRMS <noreply@audydental.com>',
        to: [user.email],
        subject: 'Reset Your CRMS Password',
        html: buildPasswordResetEmail({ name: user.name, resetUrl }),
      }),
    })
  }

  return c.json(ok(null, 'If that email exists, a reset link has been sent.'))
})

// ─── Reset Password ───────────────────────────────────────────────────────────
app.post('/reset-password', zValidator('json', z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})), async (c) => {
  const { token, password } = c.req.valid('json')
  const db = c.get('db')

  const kvKey = `pwd_reset:${token}`
  const userId = await c.env.CACHE.get(kvKey)

  if (!userId) {
    return c.json(err('This reset link is invalid or has expired. Please request a new one.'), 400)
  }

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  })

  if (!user || !user.isActive) {
    return c.json(err('User not found.'), 404)
  }

  const bcrypt = await import('bcryptjs')
  const passwordHash = await bcrypt.hash(password, 12)

  await db.update(schema.users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(schema.users.id, userId))

  // Invalidate the token after use
  await c.env.CACHE.delete(kvKey)

  // Invalidate all active sessions for security
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId))

  return c.json(ok(null, 'Password reset successfully. You can now sign in with your new password.'))
})

// ─── Password reset email template ───────────────────────────────────────────
function buildPasswordResetEmail({ name, resetUrl }: { name: string; resetUrl: string }): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="background:#4F46E5;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
            <p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:2px;text-transform:uppercase;">Change Request Management System</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700;">Reset Your Password 🔒</h1>
          </td>
        </tr>
        <tr>
          <td style="background:#fff;padding:32px;border:1px solid #E2E8F0;border-top:none;">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi <strong>${name}</strong>,</p>
            <p style="margin:0 0 24px;color:#6B7280;font-size:14px;line-height:1.6;">
              We received a request to reset your CRMS account password. Click the button below to create a new password.
              This link will expire in <strong>1 hour</strong>.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td align="center">
                  <a href="${resetUrl}"
                    style="display:inline-block;background:#4F46E5;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
                    Reset Password
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;line-height:1.6;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="margin:0 0 24px;word-break:break-all;">
              <a href="${resetUrl}" style="color:#4F46E5;font-size:12px;">${resetUrl}</a>
            </p>
            <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.6;">
              If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#F9FAFB;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9CA3AF;font-size:12px;">Sent by <strong>CRMS</strong> — IT Change Request Management System</p>
            <p style="margin:4px 0 0;color:#D1D5DB;font-size:11px;">audydental.com</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export default app
