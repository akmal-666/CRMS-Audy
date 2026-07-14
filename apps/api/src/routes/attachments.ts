import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import type { Bindings, Variables } from '../types'
import { schema } from '@crms/db'
import { ok, err } from '../lib/response'
import { generateId } from '../lib/id'
import {
  uploadFile,
  downloadFile,
  deleteFile,
  createSignedUrl,
  getStorageConfig,
} from '../lib/supabase-storage'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/zip',
  'video/mp4',
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

// ─── Upload ───────────────────────────────────────────────────────────────────
app.post('/:workItemId/attachments', async (c) => {
  const { workItemId } = c.req.param()
  const db = c.get('db')
  const user = c.get('user')
  const storage = getStorageConfig(c.env)

  // Verify work item exists
  const item = await db.query.workItems.findFirst({
    where: eq(schema.workItems.id, workItemId),
  })
  if (!item) return c.json(err('Work item not found'), 404)

  const formData = await c.req.formData()
  const files = formData.getAll('files') as unknown as File[]

  if (!files.length) return c.json(err('No files provided'), 400)

  const uploaded: {
    id: string
    fileName: string
    fileSize: number
    publicUrl: string
  }[] = []

  for (const file of files) {
    // Validate type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return c.json(err(`File type "${file.type}" is not allowed`), 400)
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return c.json(err(`File "${file.name}" exceeds the 50MB limit`), 400)
    }

    const id = generateId()
    // Path pattern: attachments/{workItemId}/{id}-{filename}
    const storagePath = `attachments/${workItemId}/${id}-${file.name}`

    try {
      const { publicUrl } = await uploadFile(
        storage,
        storagePath,
        await file.arrayBuffer(),
        file.type
      )

      await db.insert(schema.attachments).values({
        id,
        workItemId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        r2Key: storagePath,  // reuse column — stores Supabase path
        uploadedBy: user?.sub ?? null,
        createdAt: new Date(),
      })

      await db.insert(schema.activityLogs).values({
        id: generateId(),
        workItemId,
        userId: user?.sub ?? null,
        action: 'attachment_uploaded',
        description: `Attachment uploaded: ${file.name}`,
        metadata: { fileName: file.name, fileSize: file.size },
        createdAt: new Date(),
      })

      uploaded.push({ id, fileName: file.name, fileSize: file.size, publicUrl })
    } catch (error) {
      console.error('Upload error:', error)
      return c.json(err(`Failed to upload "${file.name}"`), 500)
    }
  }

  return c.json(ok(uploaded, `${uploaded.length} file(s) uploaded`), 201)
})

// ─── Download (proxied with signed URL) ──────────────────────────────────────
app.get('/:workItemId/attachments/:attachmentId/download', async (c) => {
  const { attachmentId } = c.req.param()
  const db = c.get('db')
  const storage = getStorageConfig(c.env)

  const attachment = await db.query.attachments.findFirst({
    where: eq(schema.attachments.id, attachmentId),
  })
  if (!attachment) return c.json(err('Attachment not found'), 404)

  try {
    // Option 1: Proxy the file through Worker
    const fileRes = await downloadFile(storage, attachment.r2Key)

    return new Response(fileRes.body, {
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Disposition': `attachment; filename="${attachment.fileName}"`,
        'Content-Length': String(attachment.fileSize),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return c.json(err('File not found in storage'), 404)
  }
})

// ─── Signed URL (direct download link, expires in 1h) ────────────────────────
app.get('/:workItemId/attachments/:attachmentId/signed-url', async (c) => {
  const { attachmentId } = c.req.param()
  const db = c.get('db')
  const storage = getStorageConfig(c.env)

  const attachment = await db.query.attachments.findFirst({
    where: eq(schema.attachments.id, attachmentId),
  })
  if (!attachment) return c.json(err('Attachment not found'), 404)

  try {
    const signedUrl = await createSignedUrl(storage, attachment.r2Key, 3600)
    return c.json(ok({ signedUrl, expiresIn: 3600 }))
  } catch (error) {
    console.error('Signed URL error:', error)
    return c.json(err('Could not generate download link'), 500)
  }
})

// ─── Delete ───────────────────────────────────────────────────────────────────
app.delete('/:workItemId/attachments/:attachmentId', async (c) => {
  const { attachmentId } = c.req.param()
  const db = c.get('db')
  const user = c.get('user')
  const storage = getStorageConfig(c.env)

  const attachment = await db.query.attachments.findFirst({
    where: eq(schema.attachments.id, attachmentId),
  })
  if (!attachment) return c.json(err('Attachment not found'), 404)

  // Only uploader or admin can delete
  if (attachment.uploadedBy !== user?.sub && user?.role !== 'administrator') {
    return c.json(err('Forbidden'), 403)
  }

  try {
    await deleteFile(storage, attachment.r2Key)
  } catch (error) {
    // Log but don't fail if file is already gone from storage
    console.warn('Storage delete warning:', error)
  }

  await db.delete(schema.attachments).where(eq(schema.attachments.id, attachmentId))

  return c.json(ok(null, 'Attachment deleted'))
})

export default app
