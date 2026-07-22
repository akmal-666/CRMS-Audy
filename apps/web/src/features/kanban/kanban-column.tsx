'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
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
        {!isReadOnly && (
          <button className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2.5 min-h-[200px] rounded-xl p-2 transition-all duration-200',
          isOver ? 'bg-primary/5 border-2 border-dashed border-primary/30' : 'bg-muted/30'
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
