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
import { uploadFile, deleteFile, getStorageConfig } from '../lib/supabase-storage'
import { getB2Config, uploadToB2, getPresignedDownloadUrl, deleteFromB2 } from '../lib/b2-storage'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole),
  departmentId: z.string().optional(),
  branchId: z.string().optional(),
})

app.get('/', authMiddleware, requireRole(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.BUSINESS_ANALYST), async (c) => {
  const db = c.get('db')
  const { page = '1', pageSize = '20', role } = c.req.query()

  const pageNum = parseInt(page)
  const pageSizeNum = Math.min(parseInt(pageSize), 500) // allow up to 500 for admin views
  const offset = (pageNum - 1) * pageSizeNum

  const whereCondition = role ? eq(schema.users.role, role as any) : undefined

  const [users, totalResult] = await Promise.all([
    db.query.users.findMany({
      where: whereCondition,
      limit: pageSizeNum,
      offset,
      orderBy: [desc(schema.users.createdAt)],
      with: { department: true, branch: true },
      columns: { passwordHash: false },
    }),
    db.select({ count: count() }).from(schema.users).where(whereCondition),
  ])

  return c.json(paginate(users, totalResult[0]?.count ?? 0, pageNum, pageSizeNum))
})

app.post('/', authMiddleware, requireRole(UserRole.ADMINISTRATOR), zValidator('json', createUserSchema), async (c) => {
  const data = c.req.valid('json')
  const db = c.get('db')
  const currentUser = c.get('user')!

  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, data.email.toLowerCase()) })
  if (existing) return c.json(err('Email already exists'), 409)

  const bcrypt = await import('bcryptjs')
  const passwordHash = await bcrypt.hash(data.password, 12)

  // Generate reset token for welcome email
  const token = generateId() + generateId()
  const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const id = generateId()
  await db.insert(schema.users).values({
    id,
    email: data.email.toLowerCase(),
    name: data.name,
    passwordHash,
    role: data.role,
    departmentId: data.departmentId,
    branchId: data.branchId,
    passwordResetToken: token,
    passwordResetExpiry: expiryDate,
    mustChangePassword: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // Send welcome email with password setup link
  const appUrl = c.env.APP_URL || 'http://localhost:3000'
  const setupUrl = `${appUrl}/setup-password?token=${token}`

  if (c.env.RESEND_API_KEY) {
    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'CRMS Audy Dental <noreply@audydental.com>',
          to: [data.email.toLowerCase()],
          subject: 'Welcome to CRMS - Set Your Password',
          html: buildWelcomeEmail({ name: data.name, email: data.email.toLowerCase(), setupUrl }),
        }),
      })

      const responseText = await emailRes.text()
      if (!emailRes.ok) {
        console.error(`[create-user] Email error ${emailRes.status}: ${responseText}`)
        // Continue anyway - user is created
      } else {
        console.log(`[create-user] Welcome email sent to ${data.email}`)
      }
    } catch (emailErr) {
      console.error(`[create-user] Email failed:`, emailErr)
      // Continue anyway - user is created
    }
  } else {
    console.warn(`[create-user] RESEND_API_KEY not configured. Setup URL: ${setupUrl}`)
  }

  // Audit log
  await db.insert(schema.auditLogs).values({
    id: generateId(),
    userId: currentUser.sub,
    action: 'create',
    entityType: 'user',
    entityId: id,
    createdAt: new Date(),
  })

  return c.json(ok({ id }, 'User created and welcome email sent'), 201)
})

// Upload avatar - MUST be before /:id routes to avoid conflicts
app.post('/:id/avatar', authMiddleware, async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')!
  const db = c.get('db')

  // Users can only upload their own avatar, unless admin
  if (user.sub !== id && user.role !== UserRole.ADMINISTRATOR) {
    return c.json(err('Unauthorized'), 403)
  }

  const targetUser = await db.query.users.findFirst({ where: eq(schema.users.id, id) })
  if (!targetUser) return c.json(err('User not found'), 404)

  try {
    // Parse multipart form
    const formData = await c.req.formData()
    const file = formData.get('avatar') as File | null

    if (!file) {
      return c.json(err('No file uploaded'), 400)
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return c.json(err('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), 400)
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return c.json(err('File too large. Maximum size is 5MB.'), 400)
    }

    const b2 = getB2Config(c.env)
    const fileExt = file.name.split('.').pop() || 'jpg'
    const key = `avatars/${id}_${Date.now()}.${fileExt}`

    // Upload to B2
    const arrayBuffer = await file.arrayBuffer()
    await uploadToB2(b2, key, arrayBuffer, file.type)

    // Get a long-lived presigned URL (7 days) for avatar display
    const avatarUrl = await getPresignedDownloadUrl(b2, key, 7 * 24 * 3600)

    // Delete old avatar from B2 if exists
    if (targetUser.avatarUrl) {
      try {
        // Extract B2 key from old URL - look for avatars/ path segment
        const match = targetUser.avatarUrl.match(/avatars\/[^?]+/)
        if (match) {
          await deleteFromB2(b2, match[0])
        }
      } catch {
        // Ignore deletion errors
      }
    }

    // Update user record
    await db.update(schema.users)
      .set({ avatarUrl, updatedAt: new Date() })
      .where(eq(schema.users.id, id))

    // Audit log
    await db.insert(schema.auditLogs).values({
      id: generateId(),
      userId: user.sub,
      action: 'update',
      entityType: 'user',
      entityId: id,
      oldValues: { avatarUrl: targetUser.avatarUrl },
      newValues: { avatarUrl },
      createdAt: new Date(),
    })

    return c.json(ok({ avatarUrl }, 'Avatar uploaded successfully'))
  } catch (error: any) {
    console.error('[upload-avatar] Error:', error)
    return c.json(err(`Upload failed: ${error?.message || 'Unknown error'}`), 500)
  }
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

// ─── Welcome email template ───────────────────────────────────────────────────
function buildWelcomeEmail({ name, email, setupUrl }: { name: string; email: string; setupUrl: string }): string {
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
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700;">Welcome to CRMS! 🎉</h1>
          </td>
        </tr>
        <tr>
          <td style="background:#fff;padding:32px;border:1px solid #E2E8F0;border-top:none;">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi <strong>${name}</strong>,</p>
            <p style="margin:0 0 16px;color:#6B7280;font-size:14px;line-height:1.6;">
              Your CRMS account has been created! You can now access the Change Request Management System.
            </p>
            <p style="margin:0 0 24px;color:#6B7280;font-size:14px;line-height:1.6;">
              Before you can log in, please set your password by clicking the button below. This link will expire in <strong>7 days</strong>.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;background:#F9FAFB;border:1px solid #E2E8F0;border-radius:8px;padding:16px;">
              <tr>
                <td>
                  <p style="margin:0 0 4px;color:#9CA3AF;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Your Email</p>
                  <p style="margin:0;color:#374151;font-size:14px;font-weight:600;">${email}</p>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td align="center">
                  <a href="${setupUrl}"
                    style="display:inline-block;background:#4F46E5;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
                    Set Your Password
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;line-height:1.6;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="margin:0 0 24px;word-break:break-all;">
              <a href="${setupUrl}" style="color:#4F46E5;font-size:12px;">${setupUrl}</a>
            </p>
            <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.6;">
              If you didn't expect this email or have any questions, please contact your system administrator.
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
