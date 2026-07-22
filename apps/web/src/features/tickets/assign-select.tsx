'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Edit2, Loader2, X } from 'lucide-react'
import { apiGet, apiPatch } from '@/lib/api'
import { toast } from 'sonner'
import { getInitials } from '@/lib/utils'

interface User {
  id: string
  name: string
  role: string
}

interface AssignSelectProps {
  workItemId: string
  label: string
  field: 'managerId' | 'businessAnalystId'
  currentUser?: { id: string; name: string }
  canEdit: boolean
}

export function AssignSelect({ workItemId, label, field, currentUser, canEdit }: AssignSelectProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [selectedId, setSelectedId] = useState(currentUser?.id || '')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: () => apiGet<User[]>('/api/users', { pageSize: 100 }),
    enabled: isEditing,
  })
  
  const users = (data as any)?.data ?? []

  const updateMutation = useMutation({
    mutationFn: (newId: string | null) => 
      apiPatch(`/api/work-items/${workItemId}/assign`, { [field]: newId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item', workItemId] })
      queryClient.invalidateQueries({ queryKey: ['work-items'] })
      toast.success(`${label} assigned`)
      setIsEditing(false)
    },
    onError: () => toast.error(`Failed to assign ${label}`),
  })

  const handleSave = () => {
    if (selectedId === (currentUser?.id || '')) {
      setIsEditing(false)
      return
    }
    updateMutation.mutate(selectedId || null)
  }

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between gap-2 text-sm group">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
          <div className="flex items-center gap-1.5">
            {currentUser ? (
              <>
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                  {getInitials(currentUser.name)[0]}
                </div>
                <span className="text-foreground font-medium">{currentUser.name}</span>
              </>
            ) : (
              <span className="text-foreground font-medium text-muted-foreground/60">Unassigned</span>
            )}
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
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <div className="flex items-center gap-1">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          disabled={isLoading || updateMutation.isPending}
          className="input py-1 text-xs px-2 flex-1 min-w-0"
        >
          <option value="">Unassigned</option>
          {users.map((u: User) => (
            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
          ))}
        </select>
        
        <button 
          onClick={handleSave} 
          disabled={isLoading || updateMutation.isPending}
          className="p-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex-shrink-0"
        >
          {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        </button>
        <button 
          onClick={() => { setIsEditing(false); setSelectedId(currentUser?.id || '') }}
          disabled={updateMutation.isPending}
          className="p-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground disabled:opacity-50 flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
