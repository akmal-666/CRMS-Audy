'use client'

import { useState, useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight } from 'lucide-react'
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
  departmentId: string
  department?: { id: string; name: string }
  dueDate?: string
  manager?: { id: string; name: string; avatarUrl?: string }
  developer?: { id: string; name: string; avatarUrl?: string }
  createdAt: string
}

interface KanbanGroupedColumnProps {
  status: WorkflowStatus
  items: WorkItem[]
  isLoading: boolean
  onCardClick: (id: string) => void
  isReadOnly?: boolean
}

export function KanbanGroupedColumn({ status, items, isLoading, onCardClick, isReadOnly }: KanbanGroupedColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set())

  // Group items by department
  const groupedItems = useMemo(() => {
    const groups = new Map<string, { dept: { id: string; name: string }; items: WorkItem[] }>()
    
    items.forEach(item => {
      const deptId = item.departmentId || 'unknown'
      const deptName = item.department?.name || 'Unknown Department'
      
      if (!groups.has(deptId)) {
        groups.set(deptId, {
          dept: { id: deptId, name: deptName },
          items: []
        })
      }
      groups.get(deptId)!.items.push(item)
    })

    return Array.from(groups.values()).sort((a, b) => a.dept.name.localeCompare(b.dept.name))
  }, [items])

  const toggleDepartment = (deptId: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev)
      if (next.has(deptId)) {
        next.delete(deptId)
      } else {
        next.add(deptId)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedDepts(new Set(groupedItems.map(g => g.dept.id)))
  }

  const collapseAll = () => {
    setExpandedDepts(new Set())
  }

  return (
    <div className="kanban-column" style={{ width: 320 }}>
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
        <div className="flex items-center gap-1">
          {groupedItems.length > 0 && (
            <>
              <button
                onClick={expandAll}
                className="text-[10px] px-1.5 py-0.5 rounded hover:bg-muted transition-colors text-muted-foreground"
                title="Expand all"
              >
                Expand
              </button>
              <button
                onClick={collapseAll}
                className="text-[10px] px-1.5 py-0.5 rounded hover:bg-muted transition-colors text-muted-foreground"
                title="Collapse all"
              >
                Collapse
              </button>
            </>
          )}
        </div>
      </div>

      {/* Drop zone with grouped items */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2.5 min-h-[200px] rounded-xl p-2 transition-all duration-200',
          isOver ? 'bg-primary/5 border-2 border-dashed border-primary/30' : 'bg-muted/30'
        )}
      >
        {isLoading ? (
          [...Array(2)].map((_, i) => <KanbanCardSkeleton key={i} />)
        ) : groupedItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-muted-foreground/50 text-center py-4">Drop here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {groupedItems.map(({ dept, items: deptItems }) => {
              const isExpanded = expandedDepts.has(dept.id)
              
              return (
                <div key={dept.id} className="space-y-1.5">
                  {/* Department header */}
                  <button
                    onClick={() => toggleDepartment(dept.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/60 transition-colors group"
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="text-xs font-medium text-foreground truncate flex-1 text-left">
                      {dept.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                      {deptItems.length}
                    </span>
                  </button>

                  {/* Department items */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <SortableContext items={deptItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-2 pl-4">
                            {deptItems.map((item) => (
                              <KanbanCard 
                                key={item.id} 
                                item={item} 
                                onClick={() => onCardClick(item.id)} 
                                isReadOnly={isReadOnly} 
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
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
