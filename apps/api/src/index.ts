import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { secureHeaders } from 'hono/secure-headers'
import type { Bindings, Variables } from './types'
import { dbMiddleware } from './middleware/db'
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

// Queue consumer for emails
export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch, env: Bindings): Promise<void> {
    for (const message of batch.messages) {
      const payload = message.body as Record<string, unknown>
      console.log('Processing email queue message:', payload.type)
      // In production: integrate with Resend/SendGrid
      message.ack()
    }
  },
}
