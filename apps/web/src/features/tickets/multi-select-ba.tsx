'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Edit2, Loader2, Plus, Search, X } from 'lucide-react'
import { apiGet, apiPost, apiDelete } from '@/lib/api'
import { toast } from 'sonner'
import { getInitials, cn } from '@/lib/utils'

interface BAUser {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
}

interface MultiSelectBAProps {
  workItemId: string
  /** Current BAs from junction table (passed from parent) */
  assignedBAs: BAUser[]
  canEdit: boolean
}

export function MultiSelectBA({ workItemId, assignedBAs, canEdit }: MultiSelectBAProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Fetch all BA users when dropdown opens
  const { data: baListData, isLoading: isLoadingList } = useQuery({
    queryKey: ['users', 'list', 'business_analyst'],
    queryFn: () => apiGet<BAUser[]>('/api/users', { pageSize: 200, role: 'business_analyst' }),
    enabled: isOpen,
    staleTime: 60_000,
  })
  const allBAs: BAUser[] = (baListData as any)?.data ?? []

  const assignedIds = new Set(assignedBAs.map(ba => ba.id))

  const filtered = search
    ? allBAs.filter(u => u.name.toLowerCase().includes(search.toLowerCase()))
    : allBAs

  // Add BA
  const addMutation = useMutation({
    mutationFn: (userId: string) =>
      apiPost(`/api/work-items/${workItemId}/business-analysts`, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item', workItemId] })
      queryClient.invalidateQueries({ queryKey: ['work-items'] })
      toast.success('Business Analyst assigned')
    },
    onError: () => toast.error('Failed to assign Business Analyst'),
  })

  // Remove BA
  const removeMutation = useMutation({
    mutationFn: (userId: string) =>
      apiDelete(`/api/work-items/${workItemId}/business-analysts/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item', workItemId] })
      queryClient.invalidateQueries({ queryKey: ['work-items'] })
      toast.success('Business Analyst removed')
    },
    onError: () => toast.error('Failed to remove Business Analyst'),
  })

  const isPending = addMutation.isPending || removeMutation.isPending

  const handleToggle = (user: BAUser) => {
    if (assignedIds.has(user.id)) {
      removeMutation.mutate(user.id)
    } else {
      addMutation.mutate(user.id)
    }
  }

  return (
    <div ref={dropdownRef} className="relative">
      <p className="text-xs text-muted-foreground mb-1">Business Analyst</p>

      {/* Assigned BAs list */}
      <div className="space-y-1 min-h-[24px]">
        {assignedBAs.length === 0 ? (
          <p className="text-sm text-muted-foreground/60 font-medium">Unassigned</p>
        ) : (
          assignedBAs.map(ba => (
            <div key={ba.id} className="flex items-center gap-1.5 group">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                {ba.avatarUrl
                  ? <img src={ba.avatarUrl} alt={ba.name} className="w-5 h-5 rounded-full object-cover" />
                  : getInitials(ba.name)[0]
                }
              </div>
              <span className="text-sm text-foreground font-medium flex-1 truncate">{ba.name}</span>
              {canEdit && (
                <button
                  onClick={() => removeMutation.mutate(ba.id)}
                  disabled={isPending}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-all disabled:opacity-30"
                  title="Remove"
                >
                  {removeMutation.isPending && removeMutation.variables === ba.id
                    ? <Loader2 size={11} className="animate-spin" />
                    : <X size={11} />
                  }
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add button */}
      {canEdit && (
        <button
          onClick={() => setIsOpen(v => !v)}
          disabled={isPending}
          className="mt-1.5 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
        >
          <Plus size={12} />
          Add BA
        </button>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 w-64 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search Business Analyst..."
                className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-48 overflow-y-auto py-1">
            {isLoadingList ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={14} className="animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {search ? 'No results' : 'No Business Analysts found'}
              </p>
            ) : (
              filtered.map(user => {
                const isAssigned = assignedIds.has(user.id)
                const isProcessing = isPending &&
                  (addMutation.variables === user.id || removeMutation.variables === user.id)
                return (
                  <button
                    key={user.id}
                    onClick={() => handleToggle(user)}
                    disabled={isPending}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted transition-colors disabled:opacity-50',
                      isAssigned && 'bg-primary/5'
                    )}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                      {user.avatarUrl
                        ? <img src={user.avatarUrl} alt={user.name} className="w-6 h-6 rounded-full object-cover" />
                        : getInitials(user.name)[0]
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate text-xs">{user.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="flex-shrink-0 w-4">
                      {isProcessing
                        ? <Loader2 size={12} className="animate-spin text-primary" />
                        : isAssigned
                          ? <Check size={12} className="text-primary" />
                          : null
                      }
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
