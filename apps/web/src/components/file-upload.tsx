'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileText, Image, Film, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { apiPost } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface UploadingFile {
  id: string
  name: string
  size: number
  type: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress: number
  error?: string
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
  'application/zip',
  'video/mp4',
]

const MAX_SIZE = 50 * 1024 * 1024

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image size={16} className="text-blue-400" />
  if (mimeType.startsWith('video/')) return <Film size={16} className="text-purple-400" />
  return <FileText size={16} className="text-muted-foreground" />
}

interface FileUploadProps {
  workItemId: string
  guestName?: string
  onUploaded?: () => void
}

export function FileUpload({ workItemId, guestName, onUploaded }: FileUploadProps) {
  const [files, setFiles] = useState<UploadingFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const handleFiles = useCallback(async (rawFiles: FileList | null) => {
    if (!rawFiles) return
    const newFiles: UploadingFile[] = []

    for (const file of Array.from(rawFiles)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`File type not allowed: ${file.name}`)
        continue
      }
      if (file.size > MAX_SIZE) {
        toast.error(`File too large (max 50MB): ${file.name}`)
        continue
      }
      newFiles.push({ id: crypto.randomUUID(), name: file.name, size: file.size, type: file.type, status: 'pending', progress: 0 })
    }

    if (!newFiles.length) return
    setFiles(prev => [...prev, ...newFiles])

    // Upload each file
    for (let i = 0; i < newFiles.length; i++) {
      const entry = newFiles[i]
      const rawFile = Array.from(rawFiles).find(f => f.name === entry.name && f.size === entry.size)!

      setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: 'uploading', progress: 10 } : f))

      try {
        // Step 1: Get presigned upload URL from our API
        const res = await apiPost<{ presignedUrl: string; key: string; id: string }>(
          `/api/work-items/${workItemId}/attachments/presigned-upload`,
          { fileName: entry.name, fileSize: entry.size, mimeType: entry.type }
        )

        if (!res.success || !res.data) throw new Error(res.message)
        const { presignedUrl, key, id } = res.data

        setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, progress: 40 } : f))

        // Step 2: Upload directly to B2 using presigned URL
        const uploadRes = await fetch(presignedUrl, {
          method: 'PUT',
          body: rawFile,
          headers: { 'Content-Type': entry.type },
        })

        if (!uploadRes.ok) throw new Error(`B2 upload failed: ${uploadRes.status}`)

        setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, progress: 80 } : f))

        // Step 3: Confirm upload in our database
        await apiPost(`/api/work-items/${workItemId}/attachments/confirm`, {
          id, key,
          fileName: entry.name,
          fileSize: entry.size,
          mimeType: entry.type,
          guestName,
        })

        setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: 'done', progress: 100 } : f))
        queryClient.invalidateQueries({ queryKey: ['work-item', workItemId] })
        onUploaded?.()
      } catch (error: any) {
        setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: 'error', error: error.message } : f))
        toast.error(`Failed to upload ${entry.name}`)
      }
    }
  }, [workItemId, guestName, onUploaded, queryClient])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id))

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border hover:border-primary/50 hover:bg-muted/30'
        )}
      >
        <Upload size={24} className={cn('mx-auto mb-2', isDragging ? 'text-primary' : 'text-muted-foreground')} />
        <p className="text-sm font-medium text-foreground">
          {isDragging ? 'Drop files here' : 'Click or drag & drop to upload'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, Images, ZIP, MP4 — Max 50MB</p>
        <input ref={inputRef} type="file" multiple className="hidden" accept={ALLOWED_TYPES.join(',')} onChange={e => handleFiles(e.target.files)} />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(file => (
            <div key={file.id} className={cn(
              'flex items-center gap-3 p-3 rounded-lg border text-sm transition-colors',
              file.status === 'done' ? 'border-success/30 bg-success/5' :
              file.status === 'error' ? 'border-danger/30 bg-danger/5' :
              'border-border bg-card'
            )}>
              <div className="flex-shrink-0">{getFileIcon(file.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{file.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                  {file.status === 'uploading' && (
                    <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${file.progress}%` }} />
                    </div>
                  )}
                  {file.status === 'error' && <span className="text-xs text-danger">{file.error}</span>}
                </div>
              </div>
              <div className="flex-shrink-0">
                {file.status === 'uploading' && <Loader2 size={14} className="text-primary animate-spin" />}
                {file.status === 'done' && <CheckCircle2 size={14} className="text-success" />}
                {file.status === 'error' && <AlertCircle size={14} className="text-danger" />}
                {(file.status === 'pending' || file.status === 'done' || file.status === 'error') && (
                  <button onClick={() => removeFile(file.id)} className="ml-2 text-muted-foreground hover:text-danger transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
