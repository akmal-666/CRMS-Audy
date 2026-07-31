'use client'

import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { apiPatch, apiGet } from '@/lib/api'
import { toast } from 'sonner'
import { Check, X, Pencil } from 'lucide-react'
import { PRIORITY_LABELS, PRIORITY_COLORS, cn, formatDate } from '@/lib/utils'
import { Priority } from '@crms/types'

interface EditableDetailFieldProps {
  workItemId: string
  field: 'priority' | 'dueDate' | 'departmentId' | 'branchId' | 'vendorId'
  label: string
  currentValue: any
  displayValue?: string
  canEdit: boolean
  type?: 'select' | 'date'
  options?: Array<{ id: string; name: string }>
}

export function EditableDetailField({
  workItemId,
  field,
  label,
  currentValue,
  displayValue,
  canEdit,
  type = 'select',
  options,
}: EditableDetailFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(currentValue || '')
  const queryClient = useQueryClient()

  // Fetch options for departments, branches, vendors
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => apiGet<any[]>('/api/master/departments'),
    select: (res) => res.data ?? [],
    enabled: field === 'departmentId' && !options,
  })

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => apiGet<any[]>('/api/master/branches'),
    select: (res) => res.data ?? [],
    enabled: field === 'branchId' && !options,
  })

  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => apiGet<any[]>('/api/master/vendors'),
    select: (res) => res.data ?? [],
    enabled: field === 'vendorId' && !options,
  })

  const selectOptions = options || 
    (field === 'departmentId' ? departments : 
     field === 'branchId' ? branches : 
     field === 'vendorId' ? vendors : [])

  const priorityOptions = [
    { value: 'low', label: 'Low', color: PRIORITY_COLORS.low },
    { value: 'medium', label: 'Medium', color: PRIORITY_COLORS.medium },
    { value: 'high', label: 'High', color: PRIORITY_COLORS.high },
    { value: 'critical', label: 'Critical', color: PRIORITY_COLORS.critical },
  ]

  const updateMutation = useMutation({
    mutationFn: async (newValue: string) => {
      return apiPatch(`/api/work-items/${workItemId}`, { [field]: newValue })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item', workItemId] })
      queryClient.invalidateQueries({ queryKey: ['work-items'] })
      toast.success(`${label} updated successfully`)
      setIsEditing(false)
    },
    onError: () => {
      toast.error(`Failed to update ${label}`)
    },
  })

  const handleSave = () => {
    if (value === currentValue) {
      setIsEditing(false)
      return
    }
    updateMutation.mutate(value)
  }

  const handleCancel = () => {
    setValue(currentValue || '')
    setIsEditing(false)
  }

  // Display value logic
  let display = displayValue
  if (!display) {
    if (field === 'priority') {
      display = PRIORITY_LABELS[currentValue as Priority] || currentValue
    } else if (field === 'dueDate' && currentValue) {
      display = formatDate(currentValue)
    } else if (field === 'departmentId' || field === 'branchId' || field === 'vendorId') {
      const item = selectOptions?.find((opt: any) => opt.id === currentValue)
      display = item?.name || '—'
    } else {
      display = currentValue || '—'
    }
  }

  if (!canEdit) {
    return (
      <div>
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        {field === 'priority' && currentValue ? (
          <span className={cn('badge text-xs', PRIORITY_COLORS[currentValue as Priority])}>
            {PRIORITY_LABELS[currentValue as Priority]}
          </span>
        ) : (
          <p className="text-sm font-medium text-foreground">{display}</p>
        )}
      </div>
    )
  }

  if (!isEditing) {
    return (
      <div>
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <div className="flex items-center gap-2 group">
          {field === 'priority' && currentValue ? (
            <span className={cn('badge text-xs', PRIORITY_COLORS[currentValue as Priority])}>
              {PRIORITY_LABELS[currentValue as Priority]}
            </span>
          ) : (
            <p className="text-sm font-medium text-foreground">{display}</p>
          )}
          <button
            onClick={() => {
              setValue(currentValue || '')
              setIsEditing(true)
            }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all"
            title="Edit"
          >
            <Pencil size={12} className="text-muted-foreground" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <div className="flex items-center gap-1">
        {type === 'date' ? (
          <input
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="input text-xs py-1 flex-1"
            autoFocus
          />
        ) : field === 'priority' ? (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="input text-xs py-1 flex-1"
            autoFocus
          >
            {priorityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="input text-xs py-1 flex-1"
            autoFocus
          >
            <option value="">Select...</option>
            {selectOptions?.map((opt: any) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="p-1 rounded hover:bg-success/10 text-success disabled:opacity-50"
          title="Save"
        >
          <Check size={14} />
        </button>
        <button
          onClick={handleCancel}
          disabled={updateMutation.isPending}
          className="p-1 rounded hover:bg-destructive/10 text-destructive disabled:opacity-50"
          title="Cancel"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
