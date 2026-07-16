import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import type { Bindings, Variables } from '../types'
import { schema } from '@crms/db'
import { ok, err } from '../lib/response'
import { generateId } from '../lib/id'
import {
  getB2Config,
  uploadToB2,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  deleteFromB2,
} from '../lib/b2-storage'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  // Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // PPT
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]

const MAX_FILE_SIZE = 30 * 1024 * 1024 // 30MB

// ─── Presigned URL for direct upload (frontend uploads directly to B2) ────────
const presignedUploadSchema = z.object({
  fileName: z.string(),
  fileSize: z.number().max(MAX_FILE_SIZE, 'File exceeds 30MB limit'),
  mimeType: z.string().refine(t => ALLOWED_MIME_TYPES.includes(t), 'File type not allowed'),
})

app.post('/:workItemId/attachments/presigned-upload', zValidator('json', presignedUploadSchema), async (c) => {
  const { workItemId } = c.req.param()
  const { fileName, fileSize, mimeType } = c.req.valid('json')
  const db = c.get('db')

  // Verify work item exists
  const item = await db.query.workItems.findFirst({ where: eq(schema.workItems.id, workItemId) })
  if (!item) return c.json(err('Work item not found'), 404)

  const id = generateId()
  const ext = fileName.split('.').pop()
  const key = `attachments/${workItemId}/${id}.${ext}`

  const b2 = getB2Config(c.env)
  const presignedUrl = await getPresignedUploadUrl(b2, key, mimeType, 600)

  return c.json(ok({ presignedUrl, key, id }, 'Presigned URL generated'))
})

// ─── Confirm upload (save metadata to DB after successful B2 upload) ──────────
const confirmUploadSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
  key: z.string(),
  guestName: z.string().optional(),
})

app.post('/:workItemId/attachments/confirm', zValidator('json', confirmUploadSchema), async (c) => {
  const { workItemId } = c.req.param()
  const data = c.req.valid('json')
  const db = c.get('db')
  const user = c.get('user')

  await db.insert(schema.attachments).values({
    id: data.id,
    workItemId,
    fileName: data.fileName,
    fileSize: data.fileSize,
    mimeType: data.mimeType,
    r2Key: data.key,
    uploadedBy: user?.sub ?? null,
    uploadedByGuest: data.guestName ?? null,
    createdAt: new Date(),
  })

  await db.insert(schema.activityLogs).values({
    id: generateId(),
    workItemId,
    userId: user?.sub ?? null,
    guestName: data.guestName ?? null,
    action: 'attachment_uploaded',
    description: `Attachment uploaded: ${data.fileName}`,
    metadata: { fileName: data.fileName, fileSize: data.fileSize },
    createdAt: new Date(),
  })

  return c.json(ok({ id: data.id, fileName: data.fileName }, 'Attachment saved'), 201)
})

// ─── Server-side upload (multipart form, for smaller files from admin) ────────
app.post('/:workItemId/attachments', async (c) => {
  const { workItemId } = c.req.param()
  const db = c.get('db')
  const user = c.get('user')

  const item = await db.query.workItems.findFirst({ where: eq(schema.workItems.id, workItemId) })
  if (!item) return c.json(err('Work item not found'), 404)

  const formData = await c.req.formData()
  const files = formData.getAll('files') as unknown as File[]
  if (!files.length) return c.json(err('No files provided'), 400)

  const b2 = getB2Config(c.env)
  const uploaded: { id: string; fileName: string; fileSize: number }[] = []

  for (const file of files) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) return c.json(err(`File type "${file.type}" not allowed`), 400)
    if (file.size > MAX_FILE_SIZE) return c.json(err(`File "${file.name}" exceeds 30MB`), 400)

    const id = generateId()
    const ext = file.name.split('.').pop()
    const key = `attachments/${workItemId}/${id}.${ext}`

    try {
      await uploadToB2(b2, key, await file.arrayBuffer(), file.type)

      await db.insert(schema.attachments).values({
        id, workItemId,
        fileName: file.name, fileSize: file.size, mimeType: file.type,
        r2Key: key, uploadedBy: user?.sub ?? null, createdAt: new Date(),
      })
      await db.insert(schema.activityLogs).values({
        id: generateId(), workItemId, userId: user?.sub ?? null,
        action: 'attachment_uploaded', description: `Attachment uploaded: ${file.name}`,
        metadata: { fileName: file.name, fileSize: file.size }, createdAt: new Date(),
      })
      uploaded.push({ id, fileName: file.name, fileSize: file.size })
    } catch (error) {
      console.error('Upload error:', error)
      return c.json(err(`Failed to upload "${file.name}"`), 500)
    }
  }

  return c.json(ok(uploaded, `${uploaded.length} file(s) uploaded`), 201)
})

// ─── Download — redirect to presigned B2 URL ─────────────────────────────────
app.get('/:workItemId/attachments/:attachmentId/download', async (c) => {
  const { attachmentId } = c.req.param()
  const db = c.get('db')

  const attachment = await db.query.attachments.findFirst({ where: eq(schema.attachments.id, attachmentId) })
  if (!attachment) return c.json(err('Attachment not found'), 404)

  const b2 = getB2Config(c.env)
  const signedUrl = await getPresignedDownloadUrl(b2, attachment.r2Key, 3600)

  // Redirect browser directly to B2 signed URL
  return c.redirect(signedUrl, 302)
})

// ─── Delete ───────────────────────────────────────────────────────────────────
app.delete('/:workItemId/attachments/:attachmentId', async (c) => {
  const { attachmentId } = c.req.param()
  const db = c.get('db')
  const user = c.get('user')

  const attachment = await db.query.attachments.findFirst({ where: eq(schema.attachments.id, attachmentId) })
  if (!attachment) return c.json(err('Attachment not found'), 404)

  if (attachment.uploadedBy !== user?.sub && user?.role !== 'administrator') {
    return c.json(err('Forbidden'), 403)
  }

  const b2 = getB2Config(c.env)
  try {
    await deleteFromB2(b2, attachment.r2Key)
  } catch (error) {
    console.warn('B2 delete warning:', error)
  }

  await db.delete(schema.attachments).where(eq(schema.attachments.id, attachmentId))
  return c.json(ok(null, 'Attachment deleted'))
})

export default app
