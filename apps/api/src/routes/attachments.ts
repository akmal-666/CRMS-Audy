import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import type { Bindings, Variables } from '../types'
import { schema } from '@crms/db'
import { ok, err } from '../lib/response'
import { generateId } from '../lib/id'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'application/zip',
  'video/mp4',
]
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

app.post('/:workItemId/attachments', async (c) => {
  const { workItemId } = c.req.param()
  const db = c.get('db')
  const user = c.get('user')

  const item = await db.query.workItems.findFirst({ where: eq(schema.workItems.id, workItemId) })
  if (!item) return c.json(err('Work item not found'), 404)

  const formData = await c.req.formData()
  const files = formData.getAll('files') as File[]

  if (!files.length) return c.json(err('No files uploaded'), 400)

  const uploaded: { id: string; fileName: string; fileSize: number }[] = []

  for (const file of files) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return c.json(err(`File type ${file.type} not allowed`), 400)
    }
    if (file.size > MAX_FILE_SIZE) {
      return c.json(err(`File ${file.name} exceeds 50MB limit`), 400)
    }

    const id = generateId()
    const r2Key = `attachments/${workItemId}/${id}-${file.name}`

    await c.env.STORAGE.put(r2Key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { fileName: file.name, workItemId, uploadedBy: user?.sub || 'guest' },
    })

    await db.insert(schema.attachments).values({
      id,
      workItemId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      r2Key,
      uploadedBy: user?.sub,
      createdAt: new Date(),
    })

    await db.insert(schema.activityLogs).values({
      id: generateId(),
      workItemId,
      userId: user?.sub,
      action: 'attachment_uploaded',
      description: `Attachment uploaded: ${file.name}`,
      createdAt: new Date(),
    })

    uploaded.push({ id, fileName: file.name, fileSize: file.size })
  }

  return c.json(ok(uploaded, 'Files uploaded'), 201)
})

// Get signed URL for download
app.get('/:workItemId/attachments/:attachmentId/download', async (c) => {
  const { attachmentId } = c.req.param()
  const db = c.get('db')

  const attachment = await db.query.attachments.findFirst({ where: eq(schema.attachments.id, attachmentId) })
  if (!attachment) return c.json(err('Attachment not found'), 404)

  const object = await c.env.STORAGE.get(attachment.r2Key)
  if (!object) return c.json(err('File not found in storage'), 404)

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('Content-Disposition', `attachment; filename="${attachment.fileName}"`)

  return new Response(object.body, { headers })
})

app.delete('/:workItemId/attachments/:attachmentId', async (c) => {
  const { attachmentId } = c.req.param()
  const db = c.get('db')
  const user = c.get('user')

  const attachment = await db.query.attachments.findFirst({ where: eq(schema.attachments.id, attachmentId) })
  if (!attachment) return c.json(err('Attachment not found'), 404)

  await c.env.STORAGE.delete(attachment.r2Key)
  await db.delete(schema.attachments).where(eq(schema.attachments.id, attachmentId))

  return c.json(ok(null, 'Attachment deleted'))
})

export default app
