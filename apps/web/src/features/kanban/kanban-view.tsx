'use client'

import Link from 'next/link'

import { useState, useCallback } from 'react'
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
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Filter, Search, Download } from 'lucide-react'
import { apiGet, apiPatch } from '@/lib/api'
import { WorkflowStatus } from '@crms/types'
import { STATUS_LABELS, STATUS_DOT_COLORS, cn, exportToCSV } from '@/lib/utils'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'
import { TicketDetailDrawer } from '../tickets/ticket-detail-drawer'
import { toast } from 'sonner'

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
  department?: { name: string }
  dueDate?: string
  manager?: { id: string; name: string; avatarUrl?: string }
  developer?: { id: string; name: string; avatarUrl?: string }
  vendor?: { id: string; name: string }
  createdAt: string
  updatedAt: string
}

export function KanbanView() {
  const [search, setSearch] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const { data, isLoading } = useQuery({
    queryKey: ['work-items', 'kanban', search],
    queryFn: () => apiGet<WorkItem[]>('/api/work-items', { search: search || undefined, pageSize: 500 }),
    select: (res) => res.data ?? [],
  })

  const workItems: WorkItem[] = useMemo(() => (data as unknown as WorkItem[]) ?? [], [data])

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiPatch(`/api/work-items/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items'] })
    },
    onError: () => {
      toast.error('Failed to update status')
      queryClient.invalidateQueries({ queryKey: ['work-items'] })
    },
  })

  const getColumnItems = useCallback(
    (status: WorkflowStatus) => workItems.filter(item => item.status === status),
    [workItems]
  )

  const activeItem = activeId ? workItems.find(i => i.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const draggedItem = workItems.find(i => i.id === active.id)
    if (!draggedItem) return

    // Determine target column
    const overId = over.id as string
    const targetColumn = COLUMNS.find(col => col === overId || col === workItems.find(i => i.id === overId)?.status)

    if (targetColumn && draggedItem.status !== targetColumn) {
      // Optimistic update
      queryClient.setQueryData(['work-items', 'kanban', search], (old: any) => {
        if (!old || !old.data) return old
        return {
          ...old,
          data: old.data.map((item: any) => item.id === draggedItem.id ? { ...item, status: targetColumn } : item)
        }
      })
      updateStatusMutation.mutate({ id: draggedItem.id, status: targetColumn })
    }
  }

  return (
    <>
      <div className="flex flex-col h-full -m-4 lg:-m-6">
        {/* Kanban toolbar */}
        <div className="flex items-center gap-3 px-4 lg:px-6 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
          <div>
            <h1 className="text-base font-semibold text-foreground">Kanban Board</h1>
            <p className="text-xs text-muted-foreground">{workItems.length} total requests</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 w-40"
              />
            </div>

            <button
              onClick={() => exportToCSV(workItems.map(i => ({
                ID: i.ticketNumber, Title: i.title, Status: STATUS_LABELS[i.status as WorkflowStatus], Priority: i.priority,
                Requester: i.requesterName, Department: i.department?.name, Vendor: i.vendor?.name, Created: i.createdAt
              })), 'kanban_export')}
              className="btn-ghost text-xs flex items-center gap-1.5 py-1.5"
            >
              <Download size={13} />
              Export
            </button>

            <button className="btn-ghost text-xs flex items-center gap-1.5 py-1.5">
              <Filter size={13} />
              Filter
            </button>

            <Link href="/requests/new" className="btn-primary flex items-center gap-1.5 text-xs py-1.5">
              <Plus size={13} />
              <span className="hidden sm:inline">New Request</span>
            </Link>
          </div>
        </div>

        {/* Kanban board */}
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
                />
              ))}

              <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
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

      {/* Ticket detail drawer */}
      <TicketDetailDrawer
        itemId={selectedItemId}
        onClose={() => setSelectedItemId(null)}
      />
    </>
  )
}
