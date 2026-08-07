'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion, AnimatePresence } from 'framer-motion'
import { WorkflowStatus } from '@crms/types'
import { STATUS_LABELS, STATUS_DOT_COLORS, cn } from '@/lib/utils'
import { KanbanCard } from './kanban-card'

const COLUMN_HEADER_COLORS: Record<WorkflowStatus, string> = {
  [WorkflowStatus.IN_PIPELINE]: 'text-slate-600 dark:text-slate-400',
  [WorkflowStatus.ASSESSMENT]: 'text-blue-600 dark:text-blue-400',
  [WorkflowStatus.DEVELOPMENT]: 'text-violet-600 dark:text-violet-400',
  [WorkflowStatus.UAT]: 'text-amber-600 dark:text-amber-400',
  [WorkflowStatus.DEPLOYMENT]: 'text-orange-600 dark:text-orange-400',
  [WorkflowStatus.GO_LIVE]: 'text-green-600 dark:text-green-400',
  [WorkflowStatus.DROP]: 'text-red-500 dark:text-red-400',
}

interface WorkItem {
  id: string
  ticketNumber: string
  title: string
  status: string
  priority: string
  requesterName: string
  department?: { name: string }
  dueDate?: string
  manager?: { id: string; name: string; avatarUrl?: string }
  businessAnalyst?: { id: string; name: string; avatarUrl?: string }
  businessAnalysts?: Array<{ id: string; name: string; avatarUrl?: string }>
  developer?: { id: string; name: string; avatarUrl?: string }
  createdAt: string
}

interface KanbanColumnProps {
  status: WorkflowStatus
  items: WorkItem[]
  isLoading: boolean
  onCardClick: (id: string) => void
  isReadOnly?: boolean
}

export function KanbanColumn({ status, items, isLoading, onCardClick, isReadOnly }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="kanban-column" style={{ width: 280 }}>
      {/* Column header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', STATUS_DOT_COLORS[status])} />
          <span className={cn('text-sm font-semibold', COLUMN_HEADER_COLORS[status])}>
            {STATUS_LABELS[status]}
          </span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>
      </div>

      {/* Drop zone with scroll */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2.5 rounded-xl p-3 transition-all duration-200',
          'bg-gray-50/80 dark:bg-gray-900/30',
          'max-h-[calc(100vh-200px)] overflow-y-auto',
          'scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent',
          isOver ? 'ring-2 ring-primary/30 ring-inset' : ''
        )}
      >
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence initial={false}>
            {isLoading
              ? [...Array(2)].map((_, i) => <KanbanCardSkeleton key={i} />)
              : items.map((item) => (
                  <KanbanCard key={item.id} item={item} onClick={() => onCardClick(item.id)} isReadOnly={isReadOnly} />
                ))
            }
          </AnimatePresence>
        </SortableContext>

        {!isLoading && items.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-muted-foreground/50 text-center py-4">Drop here</p>
          </div>
        )}
      </div>
    </div>
  )
}

function KanbanCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border/60 p-4 space-y-2.5 animate-pulse">
      <div className="h-3 bg-muted rounded w-20" />
      <div className="h-4 bg-muted rounded w-full" />
      <div className="h-3 bg-muted rounded w-2/3" />
      <div className="flex gap-2">
        <div className="h-5 bg-muted rounded-full w-14" />
        <div className="h-5 bg-muted rounded-full w-16" />
      </div>
    </div>
  )
}
