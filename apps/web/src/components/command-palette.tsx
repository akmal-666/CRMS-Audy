'use client'

import { useEffect } from 'react'
import { Search } from 'lucide-react'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onClose()
      }
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [onClose])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-lg z-50">
        <div className="bg-card rounded-xl border border-border shadow-soft-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Search size={16} className="text-muted-foreground" />
            <input
              type="text"
              autoFocus
              placeholder="Search requests, users, or commands..."
              className="flex-1 bg-transparent outline-none text-sm text-foreground"
            />
          </div>
          <div className="p-2 text-xs text-muted-foreground text-center py-6">
            Start typing to search...
          </div>
        </div>
      </div>
    </>
  )
}
