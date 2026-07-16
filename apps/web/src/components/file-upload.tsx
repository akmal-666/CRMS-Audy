'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileText, Image, Film, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { apiUpload } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface UploadingFile {
  id: string
  name: string
  size: number
  type: string
  file: File
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress: number
  error?: string
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]

const MAX_SIZE = 30 * 1024 * 1024 // 30MB

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
  workItemId?: string
  guestName?: string
  onUploaded?: () => void
  autoUpload?: boolean
  onChange?: (files: File[]) => void
}

export function FileUpload({ workItemId, guestName, onUploaded, autoUpload = true, onChange }: FileUploadProps) {
  const [files, setFiles] = useState<UploadingFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const handleFiles = useCallback(async (rawFiles: FileList | null) => {
    if (!rawFiles) return
    const newEntries: UploadingFile[] = []

    for (const file of Array.from(rawFiles)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`Tipe file tidak diizinkan: ${file.name}`)
        continue
      }
      if (file.size > MAX_SIZE) {
        toast.error(`File terlalu besar (maks 30MB): ${file.name}`)
        continue
      }
      newEntries.push({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        file,
        status: 'pending',
        progress: 0,
      })
    }

    if (!newEntries.length) return
    const updatedFiles = [...files, ...newEntries]
    setFiles(updatedFiles)

    if (!autoUpload) {
      onChange?.(updatedFiles.map(f => f.file))
      return
    }

    if (!workItemId) return

    // Upload each file via Worker (no B2 CORS needed)
    for (const entry of newEntries) {
      setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: 'uploading', progress: 5 } : f))

      try {
        const formData = new FormData()
        formData.append('files', entry.file)
        if (guestName) formData.append('guestName', guestName)

        await apiUpload(
          `/api/work-items/${workItemId}/attachments`,
          formData,
          (pct) => setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, progress: pct } : f))
        )

        setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: 'done', progress: 100 } : f))
        queryClient.invalidateQueries({ queryKey: ['work-item', workItemId] })
        onUploaded?.()
        toast.success(`${entry.name} berhasil diunggah`)
      } catch (error: any) {
        const msg = error?.response?.data?.message || error.message || 'Upload gagal'
        setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: 'error', error: msg } : f))
        toast.error(`Gagal mengunggah ${entry.name}`)
      }
    }
  }, [workItemId, guestName, onUploaded, queryClient])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const removeFile = (id: string) => {
    setFiles(prev => {
      const next = prev.filter(f => f.id !== id)
      if (!autoUpload) onChange?.(next.map(f => f.file))
      return next
    })
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          'border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 select-none',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border hover:border-primary/40 hover:bg-muted/20'
        )}
      >
        <Upload size={22} className={cn('mx-auto mb-2 transition-colors', isDragging ? 'text-primary' : 'text-muted-foreground')} />
        <p className="text-sm font-medium text-foreground">
          {isDragging ? 'Lepaskan file di sini' : 'Klik atau drag & drop untuk mengunggah'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, PPT — Maks 30MB</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept={ALLOWED_TYPES.join(',')}
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {/* File progress list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(file => (
            <div
              key={file.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border text-sm transition-colors',
                file.status === 'done'     ? 'border-success/30 bg-success/5' :
                file.status === 'error'    ? 'border-danger/30 bg-danger/5' :
                file.status === 'uploading'? 'border-primary/20 bg-primary/5' :
                'border-border bg-card'
              )}
            >
              <div className="flex-shrink-0">{getFileIcon(file.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{file.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                  {file.status === 'uploading' && (
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                  {file.status === 'uploading' && (
                    <span className="text-xs text-primary">{file.progress}%</span>
                  )}
                  {file.status === 'error' && (
                    <span className="text-xs text-danger truncate">{file.error}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {file.status === 'uploading'  && <Loader2 size={14} className="text-primary animate-spin" />}
                {file.status === 'done'       && <CheckCircle2 size={14} className="text-success" />}
                {file.status === 'error'      && <AlertCircle size={14} className="text-danger" />}
                {file.status !== 'uploading' && (
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-0.5 rounded text-muted-foreground hover:text-danger transition-colors"
                  >
                    <X size={13} />
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
