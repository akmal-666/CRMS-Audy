'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiDelete } from '@/lib/api'
import { UserRole } from '@crms/types'
import { useAuth } from '@/context/auth-context'
import { Plus, X, Building2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CollaboratingDepartment {
  id: string
  departmentId: string
  role: 'primary' | 'collaborating'
  department: {
    id: string
    name: string
    code: string
  }
  createdAt: string
}

interface Department {
  id: string
  name: string
  code: string
}

export function CollaboratingDepartments({ 
  workItemId, 
  primaryDepartmentId,
  canEdit 
}: { 
  workItemId: string
  primaryDepartmentId: string
  canEdit: boolean
}) {
  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedDeptId, setSelectedDeptId] = useState('')

  // Get collaborating departments
  const { data: collabData, isLoading: loadingCollab } = useQuery({
    queryKey: ['work-item-departments', workItemId],
    queryFn: () => apiGet<CollaboratingDepartment[]>(`/api/work-items/${workItemId}/departments`),
  })

  // Get all departments for dropdown
  const { data: allDeptsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => apiGet<Department[]>('/api/master/departments'),
    enabled: showAddForm,
  })

  const collabDepartments = collabData?.data ?? []
  const allDepartments = allDeptsData?.data ?? []

  // Filter out primary and already added departments
  const availableDepartments = allDepartments.filter(
    d => d.id !== primaryDepartmentId && !collabDepartments.find(cd => cd.departmentId === d.id)
  )

  const addMutation = useMutation({
    mutationFn: (departmentId: string) => 
      apiPost(`/api/work-items/${workItemId}/departments`, { departmentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-departments', workItemId] })
      queryClient.invalidateQueries({ queryKey: ['work-item', workItemId] })
      toast.success('Collaborating department added')
      setShowAddForm(false)
      setSelectedDeptId('')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to add department')
    },
  })

  const removeMutation = useMutation({
    mutationFn: (departmentId: string) => 
      apiDelete(`/api/work-items/${workItemId}/departments/${departmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-departments', workItemId] })
      queryClient.invalidateQueries({ queryKey: ['work-item', workItemId] })
      toast.success('Collaborating department removed')
    },
    onError: () => {
      toast.error('Failed to remove department')
    },
  })

  const handleAdd = () => {
    if (!selectedDeptId) return
    addMutation.mutate(selectedDeptId)
  }

  if (loadingCollab) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={16} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Building2 size={14} className="text-muted-foreground" />
          Collaborating Departments
          {collabDepartments.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">
              ({collabDepartments.length})
            </span>
          )}
        </h3>
      </div>

      {collabDepartments.length === 0 && !showAddForm && (
        <p className="text-sm text-muted-foreground italic">
          No collaborating departments
        </p>
      )}

      {/* List of collaborating departments */}
      {collabDepartments.length > 0 && (
        <div className="space-y-1.5">
          {collabDepartments.map(cd => (
            <div
              key={cd.id}
              className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-background"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {cd.department.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {cd.department.code}
                </p>
              </div>
              {canEdit && (
                <button
                  onClick={() => removeMutation.mutate(cd.departmentId)}
                  disabled={removeMutation.isPending}
                  className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-950 text-muted-foreground hover:text-red-600 transition-colors"
                  title="Remove"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Inline Add form */}
      {canEdit && (
        <div className="flex items-center gap-2">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="text-xs text-primary hover:text-primary/80 transition-colors font-medium flex items-center gap-1"
            >
              <Plus size={12} /> Add Collaboration
            </button>
          ) : (
            <>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                disabled={addMutation.isPending}
              >
                <option value="">Select department...</option>
                {availableDepartments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAdd}
                disabled={!selectedDeptId || addMutation.isPending}
                className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Save"
              >
                {addMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setSelectedDeptId('')
                }}
                disabled={addMutation.isPending}
                className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
                title="Cancel"
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
