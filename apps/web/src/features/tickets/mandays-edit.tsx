'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Edit2, Loader2, X } from 'lucide-react'
import { apiPatch } from '@/lib/api'
import { toast } from 'sonner'

interface MandaysEditProps {
  workItemId: string
  currentValue: number | null
  canEdit: boolean
}

export function MandaysEdit({ workItemId, currentValue, canEdit }: MandaysEditProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(currentValue?.toString() || '')
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: (newVal: number | null) => 
      apiPatch(`/api/work-items/${workItemId}/mandays`, { mandays: newVal }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item', workItemId] })
      queryClient.invalidateQueries({ queryKey: ['work-items'] })
      toast.success('Mandays updated')
      setIsEditing(false)
    },
    onError: () => toast.error('Failed to update mandays'),
  })

  const handleSave = () => {
    const parsed = value.trim() ? parseFloat(value) : null
    if (parsed === currentValue) {
      setIsEditing(false)
      return
    }
    updateMutation.mutate(parsed)
  }

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between gap-2 text-sm group">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Mandays</p>
          <div className="flex items-center gap-1.5">
            <span className="text-foreground font-medium">
              {currentValue !== null && currentValue !== undefined ? `${currentValue} days` : <span className="text-muted-foreground/60">Not set</span>}
            </span>
          </div>
        </div>
        {canEdit && (
          <button onClick={() => setIsEditing(true)} className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground transition-all">
            <Edit2 size={13} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="text-sm">
      <p className="text-xs text-muted-foreground mb-0.5">Mandays</p>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step="0.1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={updateMutation.isPending}
          placeholder="e.g. 5.5"
          className="input py-1 text-xs px-2 flex-1 min-w-0"
        />
        <button 
          onClick={handleSave} 
          disabled={updateMutation.isPending}
          className="p-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex-shrink-0"
        >
          {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        </button>
        <button 
          onClick={() => { setIsEditing(false); setValue(currentValue?.toString() || '') }}
          disabled={updateMutation.isPending}
          className="p-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground disabled:opacity-50 flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
