import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { secureHeaders } from 'hono/secure-headers'
import type { Bindings, Variables } from './types'
import { dbMiddleware } from './middleware/db'
import { drizzle } from 'drizzle-orm/d1'
import { schema } from '@crms/db'
import { eq } from 'drizzle-orm'
import { optionalAuthMiddleware } from './middleware/auth'
import { err } from './lib/response'

// Routes
import authRoutes from './routes/auth'
import workItemRoutes from './routes/work-items'
import commentRoutes from './routes/comments'
import attachmentRoutes from './routes/attachments'
import dashboardRoutes from './routes/dashboard'
import userRoutes from './routes/users'
import masterDataRoutes from './routes/master-data'
import notificationRoutes from './routes/notifications'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Global middleware
app.use('*', logger())
app.use('*', prettyJSON())
app.use('*', secureHeaders())
app.use('*', cors({
  origin: (origin) => {
    const allowedOrigins = [
      'https://crms-audy.pages.dev',
      'https://it.audydental.com',
      'https://crms.pages.dev',
      'https://request.crms.pages.dev',
      'http://localhost:3000',
      'http://localhost:3001',
    ]
    return allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}))
app.use('*', dbMiddleware)
app.use('*', optionalAuthMiddleware)

// Routes
app.route('/api/auth', authRoutes)
app.route('/api/work-items', workItemRoutes)
app.route('/api/work-items', commentRoutes)
app.route('/api/work-items', attachmentRoutes)
app.route('/api/dashboard', dashboardRoutes)
app.route('/api/users', userRoutes)
app.route('/api/master', masterDataRoutes)
app.route('/api/notifications', notificationRoutes)

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// 404 handler
app.notFound((c) => c.json(err('Route not found'), 404))

// Error handler
app.onError((error, c) => {
  console.error('Unhandled error:', error)
  return c.json(err('Internal server error'), 500)
})

// ─── Export: Hono fetch + Queue consumer ──────────────────────────────────────
export default {
  fetch: app.fetch,

  // Cloudflare Queue consumer — sends emails via Resend
  async queue(batch: MessageBatch, env: Bindings): Promise<void> {
    console.log(`[EMAIL QUEUE] Processing batch with ${batch.messages.length} messages`)
    
    for (const message of batch.messages) {
      try {
        const payload = message.body as Record<string, unknown>
        console.log('[EMAIL QUEUE] Processing email:', {
          type: payload.type,
          to: payload.to,
          ticketNumber: payload.ticketNumber
        })

        if (payload.type === 'confirmation') {
          await sendConfirmationEmail(env, payload)
        }

        message.ack()
        console.log('[EMAIL QUEUE] Message acknowledged successfully')
      } catch (err) {
        console.error('[EMAIL QUEUE] Error processing message:', err)
        console.error('[EMAIL QUEUE] Message payload:', message.body)
        message.retry()
      }
    }
  },
}

// ─── Resend email sender ───────────────────────────────────────────────────────
async function sendConfirmationEmail(
  env: Bindings,
  payload: Record<string, unknown>
): Promise<void> {
  console.log('[RESEND] Starting email send process')
  console.log('[RESEND] RESEND_API_KEY present:', !!env.RESEND_API_KEY)
  
  if (!env.RESEND_API_KEY) {
    console.error('[RESEND] ❌ RESEND_API_KEY not set — email cannot be sent')
    throw new Error('RESEND_API_KEY is not configured')
  }

  // Small delay to allow frontend to upload attachments
  console.log('[RESEND] Waiting 2s for attachment uploads...')
  await new Promise(r => setTimeout(r, 2000))

  const db = drizzle(env.DB, { schema })
  const workItemId = payload.workItemId as string
  const role = payload.role as string

  console.log('[RESEND] Fetching work item details:', workItemId)
  let details: any = null
  if (workItemId) {
    details = await db.query.workItems.findFirst({
      where: eq(schema.workItems.id, workItemId),
      with: {
        department: true,
        vendor: true,
        attachments: true
      }
    })
    console.log('[RESEND] Work item found:', !!details)
  }

  const emailPayload = {
    from: 'CRMS Audy Dental <noreply@audydental.com>',
    to: [payload.to as string],
    subject: `[${payload.ticketNumber}] IT Request Submitted Successfully`,
    html: buildConfirmationEmail({
      name: payload.name as string,
      ticketNumber: payload.ticketNumber as string,
      title: payload.title as string,
      role,
      details
    }),
  }

  console.log('[RESEND] Sending email via Resend API:', {
    from: emailPayload.from,
    to: emailPayload.to,
    subject: emailPayload.subject
  })

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailPayload),
  })

  const responseText = await res.text()
  console.log('[RESEND] Response status:', res.status)
  console.log('[RESEND] Response body:', responseText)

  if (!res.ok) {
    console.error(`[RESEND] ❌ Failed to send email: ${res.status} ${responseText}`)
    throw new Error(`Resend API error ${res.status}: ${responseText}`)
  }

  console.log(`[RESEND] ✅ Email sent successfully to ${payload.to} — ${payload.ticketNumber}`)
}

function buildConfirmationEmail(data: {
  name: string
  ticketNumber: string
  title: string
  role?: string
  details?: any
}): string {
  const d = data.details || {}
  const department = d.department?.name || '-'
  const vendor = d.vendor?.name || '-'
  const priority = d.priority ? d.priority.toUpperCase() : '-'
  const desc = d.problemDescription || '-'
  const attachments = (d.attachments || [])
    .map((a: any) => `<li><a href="${a.fileUrl}" style="color:#4F46E5;">${a.fileName}</a></li>`)
    .join('')

  const attachmentHtml = attachments 
    ? `<ul style="margin:8px 0 0;padding-left:20px;font-size:13px;">${attachments}</ul>` 
    : '<span style="color:#9CA3AF;font-size:13px;font-style:italic;">No attachments</span>'

  const greeting = data.role === 'manager' 
    ? `Your team member has submitted a new IT Request. Please review the details below.`
    : `Your IT request has been received and is now in our queue. The IT team will review it shortly.`

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
        <!-- Header -->
        <tr>
          <td style="background:#4F46E5;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
            <p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:2px;text-transform:uppercase;">Change Request Management System</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700;">Request Submitted ✅</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#fff;padding:32px;border:1px solid #E2E8F0;border-top:none;">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi <strong>${data.name}</strong>,</p>
            <p style="margin:0 0 24px;color:#6B7280;font-size:14px;line-height:1.6;">${greeting}</p>

            <!-- Ticket number -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:#EEF2FF;border-radius:12px;padding:20px;text-align:center;border:2px dashed #C7D2FE;">
                  <p style="margin:0 0 4px;color:#6366F1;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Your Ticket Number</p>
                  <p style="margin:0;color:#4F46E5;font-size:30px;font-weight:700;font-family:'Courier New',monospace;letter-spacing:2px;">${data.ticketNumber}</p>
                </td>
              </tr>
            </table>

            <!-- Details -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;margin-bottom:20px;">
              <tr style="background:#F9FAFB;">
                <td colspan="2" style="padding:10px 16px;font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;border-bottom:1px solid #E5E7EB;">Request Details</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#6B7280;width:120px;border-bottom:1px solid #E5E7EB;">Requester</td>
                <td style="padding:12px 16px;font-size:14px;color:#374151;font-weight:600;border-bottom:1px solid #E5E7EB;">${d.requesterName || '-'} <span style="font-weight:normal;color:#9CA3AF;">(${d.requesterEmail || '-'})</span></td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Department</td>
                <td style="padding:12px 16px;font-size:14px;color:#374151;border-bottom:1px solid #E5E7EB;">${department}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Platform/Vendor</td>
                <td style="padding:12px 16px;font-size:14px;color:#374151;border-bottom:1px solid #E5E7EB;">${vendor}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Title</td>
                <td style="padding:12px 16px;font-size:14px;color:#374151;font-weight:600;border-bottom:1px solid #E5E7EB;">${data.title}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Priority</td>
                <td style="padding:12px 16px;font-size:13px;border-bottom:1px solid #E5E7EB;"><span style="background:#FEF2F2;color:#DC2626;padding:2px 8px;border-radius:12px;font-weight:600;font-size:11px;">${priority}</span></td>
              </tr>
              <tr>
                <td colspan="2" style="padding:12px 16px;font-size:14px;color:#374151;border-bottom:1px solid #E5E7EB;line-height:1.5;">
                  <strong style="font-size:13px;color:#6B7280;display:block;margin-bottom:4px;">Description:</strong>
                  ${desc}
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding:12px 16px;font-size:14px;color:#374151;">
                  <strong style="font-size:13px;color:#6B7280;display:block;margin-bottom:4px;">Attachments:</strong>
                  ${attachmentHtml}
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.6;">
              📌 Keep this ticket number for reference. You may be contacted for clarification.
            </p>
          </td>
        </tr>

        <!-- Footer -->
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
