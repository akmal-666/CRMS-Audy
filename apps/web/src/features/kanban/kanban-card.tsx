'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { Calendar, User2, AlertCircle } from 'lucide-react'
import { WorkflowStatus, Priority } from '@crms/types'
import { PRIORITY_COLORS, PRIORITY_DOT_COLORS, PRIORITY_LABELS, STATUS_BORDER_COLORS, formatDate, cn, getInitials } from '@/lib/utils'
import { differenceInDays } from 'date-fns'

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

interface KanbanCardProps {
  item: WorkItem
  isDragging?: boolean
  onClick?: () => void
  isReadOnly?: boolean
}

export function KanbanCard({ item, isDragging, onClick, isReadOnly }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: item.id, disabled: isReadOnly })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  }

  const isOverdue = item.dueDate && differenceInDays(new Date(), new Date(item.dueDate)) > 0
    && !['go_live', 'drop'].includes(item.status)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isReadOnly ? {} : listeners)}
      onClick={onClick}
      className={cn(
        'kanban-card group select-none border-l-[3px]',
        STATUS_BORDER_COLORS[item.status as WorkflowStatus],
        isDragging && 'rotate-1 scale-105 shadow-soft-lg',
        isReadOnly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
      )}
    >
      {/* Ticket number + priority */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-muted-foreground">{item.ticketNumber}</span>
        <span className={cn('badge text-xs', PRIORITY_COLORS[item.priority as Priority])}>
          <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_DOT_COLORS[item.priority as Priority])} />
          {PRIORITY_LABELS[item.priority as Priority]}
        </span>
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug mb-2.5">
        {item.title}
      </p>

      {/* Department */}
      {item.department && (
        <p className="text-xs text-muted-foreground mb-2.5">{item.department.name}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {/* Assignee avatars */}
          <div className="flex -space-x-1.5">
            {[item.manager, item.developer].filter(Boolean).slice(0, 2).map((user, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full bg-primary/80 flex items-center justify-center text-white text-xs border border-card ring-1 ring-white/10"
                title={user!.name}
              >
                {getInitials(user!.name)[0]}
              </div>
            ))}
          </div>
          {!item.manager && !item.developer && (
            <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
              <User2 size={11} />
              Unassigned
            </span>
          )}
        </div>

        {/* Due date */}
        {item.dueDate && (
          <span className={cn(
            'flex items-center gap-1 text-xs',
            isOverdue ? 'text-danger' : 'text-muted-foreground'
          )}>
            {isOverdue && <AlertCircle size={11} />}
            {!isOverdue && <Calendar size={11} />}
            {formatDate(item.dueDate, 'dd MMM')}
          </span>
        )}
      </div>
    </div>
  )
}
