'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  closestCenter,
} from '@dnd-kit/core'
import { Search, Filter } from 'lucide-react'
import { apiGet, apiPatch } from '@/lib/api'
import { WorkflowStatus, UserRole } from '@crms/types'
import { STATUS_LABELS, cn } from '@/lib/utils'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'
import { TicketDetailDrawer } from '../tickets/ticket-detail-drawer'
import { toast } from 'sonner'
import { useAuth } from '@/context/auth-context'

const COLUMNS = [
  WorkflowStatus.IN_PIPELINE,
  WorkflowStatus.ASSESSMENT,
  WorkflowStatus.DEVELOPMENT,
  WorkflowStatus.UAT,
  WorkflowStatus.DEPLOYMENT,
  WorkflowStatus.GO_LIVE,
  WorkflowStatus.DROP,
]

interface WorkItem {
  id: string
  ticketNumber: string
  title: string
  status: string
  priority: string
  requesterName: string
  departmentId: string
  department?: { id: string; name: string }
  dueDate?: string
  manager?: { id: string; name: string; avatarUrl?: string }
  businessAnalyst?: { id: string; name: string; avatarUrl?: string }
  developer?: { id: string; name: string; avatarUrl?: string }
  vendor?: { id: string; name: string }
  createdAt: string
  updatedAt: string
}

export function KanbanView() {
  const [search, setSearch] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [filterMyProjects, setFilterMyProjects] = useState(false)
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  // Check permissions
  const canDragDrop = user && [
    UserRole.ADMINISTRATOR,
    UserRole.MANAGER,
    UserRole.BUSINESS_ANALYST
  ].includes(user.role as UserRole)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['work-items', 'kanban', search],
    queryFn: () => apiGet<WorkItem[]>('/api/work-items', { search: search || undefined, pageSize: '500' }),
  })

  const workItems: WorkItem[] = useMemo(() => {
    const items = (rawData?.data ?? []) as WorkItem[]
    
    // Filter by assigned projects for BA
    if (filterMyProjects && user?.role === UserRole.BUSINESS_ANALYST) {
      return items.filter(item => {
        const matchBA = item.businessAnalyst?.id === user.id
        const matchManager = item.manager?.id === user.id
        return matchBA || matchManager
      })
    }
    
    return items
  }, [rawData, filterMyProjects, user])

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiPatch(`/api/work-items/${id}/status`, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-items'] })
      queryClient.invalidateQueries({ queryKey: ['work-item', variables.id] })
      toast.success('Status updated')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update status')
      queryClient.invalidateQueries({ queryKey: ['work-items'] })
    },
  })

  const getColumnItems = useCallback(
    (status: WorkflowStatus) => workItems.filter(item => item.status === status),
    [workItems]
  )

  const activeItem = activeId ? workItems.find(i => i.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    if (!canDragDrop) return
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!canDragDrop) return
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const draggedItem = workItems.find(i => i.id === active.id)
    if (!draggedItem) return

    const overId = over.id as string
    const targetColumn = COLUMNS.find(col => col === overId || col === workItems.find(i => i.id === overId)?.status)

    if (targetColumn && draggedItem.status !== targetColumn) {
      // Optimistic update
      queryClient.setQueryData(['work-items', 'kanban', search], (old: any) => {
        if (!old?.data) return old
        return {
          ...old,
          data: old.data.map((item: any) => 
            item.id === draggedItem.id ? { ...item, status: targetColumn } : item
          )
        }
      })
      
      updateStatusMutation.mutate({ id: draggedItem.id, status: targetColumn })
    }
  }

  return (
    <>
      <div className="flex flex-col h-full -m-4 lg:-m-6">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 lg:px-6 py-3 border-b border-border bg-card/50">
          <div>
            <h1 className="text-base font-semibold">Kanban Board</h1>
            <p className="text-xs text-muted-foreground">{workItems.length} requests</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {user?.role === UserRole.BUSINESS_ANALYST && (
              <button
                onClick={() => setFilterMyProjects(!filterMyProjects)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-lg border transition-colors",
                  filterMyProjects
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                )}
              >
                {filterMyProjects ? '✓ My Projects' : 'All Projects'}
              </button>
            )}
            
            <div className="relative hidden sm:block">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 w-40"
              />
            </div>
          </div>
        </div>

        {/* Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full gap-3 p-4 lg:p-6 min-w-max">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {COLUMNS.map(status => (
                <KanbanColumn
                  key={status}
                  status={status}
                  items={getColumnItems(status)}
                  isLoading={isLoading}
                  onCardClick={(id) => setSelectedItemId(id)}
                  isReadOnly={!canDragDrop}
                />
              ))}

              <DragOverlay>
                {activeItem && (
                  <div className="rotate-1 scale-105">
                    <KanbanCard item={activeItem} isDragging />
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      <TicketDetailDrawer
        itemId={selectedItemId}
        onClose={() => setSelectedItemId(null)}
      />
    </>
  )
}
