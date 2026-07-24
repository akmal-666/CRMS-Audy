'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, Loader2, GripVertical, Trash2, Edit2,
  ChevronLeft, ChevronRight, Calendar, X, Check,
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/context/auth-context'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { cn, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import { WorkflowStatus, UserRole } from '@crms/types'
import { toast } from 'sonner'
import {
  addDays, format, differenceInCalendarDays,
  isToday, startOfDay,
} from 'date-fns'
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'


// ─── Constants ──────────────────────────────────────────────────────────────
const COL_WIDTH = 36        // px per day column
const ROW_HEIGHT = 48       // px per row
const SIDEBAR_WIDTH = 260   // px for left sidebar
const DAYS_VISIBLE = 30     // default visible days

const COLORS = {
  blue:   { bar: 'bg-blue-500',   border: 'border-blue-600',   text: 'text-white', label: 'Blue'   },
  green:  { bar: 'bg-emerald-500',border: 'border-emerald-600',text: 'text-white', label: 'Green'  },
  yellow: { bar: 'bg-amber-400',  border: 'border-amber-500',  text: 'text-white', label: 'Yellow' },
  orange: { bar: 'bg-orange-500', border: 'border-orange-600', text: 'text-white', label: 'Orange' },
  red:    { bar: 'bg-red-500',    border: 'border-red-600',    text: 'text-white', label: 'Red'    },
  purple: { bar: 'bg-violet-500', border: 'border-violet-600', text: 'text-white', label: 'Purple' },
} as const

type TaskColor = keyof typeof COLORS

interface TimelineTask {
  id: string
  workItemId: string
  label: string
  startDate: string
  endDate: string
  color: TaskColor
  priority: string
  notes?: string | null
  sortOrder: number
  assignee?: { id: string; name: string; avatarUrl?: string } | null
}

interface WorkItemInfo {
  id: string
  ticketNumber: string
  title: string
  status: string
  priority: string
  department?: { name: string }
}


// ─── Main Page ───────────────────────────────────────────────────────────────
export function TimelinePage({ workItemId }: { workItemId: string }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canEdit = user?.role !== UserRole.BUSINESS_USER

  // Date window
  const [windowStart, setWindowStart] = useState(() => startOfDay(new Date()))
  const gridRef = useRef<HTMLDivElement>(null)

  // UI state
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editTask, setEditTask] = useState<TimelineTask | null>(null)

  // Fetch data
  const { data, isLoading } = useQuery({
    queryKey: ['timeline', workItemId],
    queryFn: () => apiGet<{ workItem: WorkItemInfo; tasks: TimelineTask[] }>(`/api/timeline/${workItemId}`),
  })

  const workItem = data?.data?.workItem
  const tasks = useMemo(() => data?.data?.tasks ?? [], [data?.data?.tasks])

  // Scroll to today on mount
  useEffect(() => {
    const todayOffset = differenceInCalendarDays(new Date(), windowStart)
    if (gridRef.current && todayOffset >= 0) {
      gridRef.current.scrollLeft = Math.max(0, todayOffset * COL_WIDTH - 100)
    }
  }, [windowStart])

  // Date navigation
  const shiftDays = (n: number) => setWindowStart(d => addDays(d, n))
  const goToToday = () => setWindowStart(startOfDay(new Date()))

  // Mutations
  const deleteMut = useMutation({
    mutationFn: (taskId: string) => apiDelete(`/api/timeline/${workItemId}/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline', workItemId] })
      toast.success('Task deleted')
    },
    onError: () => toast.error('Failed to delete task'),
  })

  const reorderMut = useMutation({
    mutationFn: (order: { id: string; sortOrder: number }[]) =>
      apiPatch(`/api/timeline/${workItemId}/reorder`, { order }),
  })

  // DnD sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = tasks.findIndex(t => t.id === active.id)
    const newIndex = tasks.findIndex(t => t.id === over.id)
    const reordered = arrayMove(tasks, oldIndex, newIndex)
    queryClient.setQueryData(['timeline', workItemId], (old: any) => ({
      ...old,
      data: { ...old.data, tasks: reordered.map((t, i) => ({ ...t, sortOrder: i })) },
    }))
    reorderMut.mutate(reordered.map((t, i) => ({ id: t.id, sortOrder: i })))
  }, [tasks, workItemId, queryClient, reorderMut])


  // Build visible days array
  const days = Array.from({ length: DAYS_VISIBLE * 2 }, (_, i) => addDays(windowStart, i - DAYS_VISIBLE / 4))

  if (isLoading) return <TimelineSkeleton />

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* ── Top bar ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/kanban" className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">{workItem?.ticketNumber}</span>
              {workItem && (
                <span className={cn('badge text-xs', STATUS_COLORS[workItem.status as WorkflowStatus])}>
                  {STATUS_LABELS[workItem.status as WorkflowStatus]}
                </span>
              )}
            </div>
            <h1 className="text-sm font-semibold text-foreground truncate">{workItem?.title ?? 'Timeline'}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => shiftDays(-7)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"><ChevronLeft size={16} /></button>
          <button onClick={goToToday} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1.5">
            <Calendar size={12} /> Today
          </button>
          <button onClick={() => shiftDays(7)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"><ChevronRight size={16} /></button>
          {canEdit && (
            <button onClick={() => setAddModalOpen(true)} className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5">
              <Plus size={14} /> Add Row
            </button>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar (frozen) */}
        <div className="flex-shrink-0 border-r border-border bg-card flex flex-col" style={{ width: SIDEBAR_WIDTH }}>
          {/* Header cell */}
          <div className="flex-shrink-0 border-b border-border px-4 py-2 flex items-center" style={{ height: 56 }}>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Task / Milestone</span>
          </div>
          {/* Rows */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <Calendar size={32} className="text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No timeline tasks yet</p>
                    {canEdit && <p className="text-xs text-muted-foreground/60 mt-1">Click &quot;Add Row&quot; to get started</p>}
                  </div>
                ) : (
                  tasks.map(task => (
                    <SidebarRow
                      key={task.id}
                      task={task}
                      canEdit={canEdit}
                      onEdit={() => setEditTask(task)}
                      onDelete={() => deleteMut.mutate(task.id)}
                    />
                  ))
                )}
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* Right: scrollable grid */}
        <div ref={gridRef} className="flex-1 overflow-x-auto overflow-y-auto">
          <div style={{ width: days.length * COL_WIDTH, minWidth: '100%' }}>
            {/* Date header */}
            <DateHeader days={days} />
            {/* Task rows */}
            {tasks.map(task => (
              <GanttRow
                key={task.id}
                task={task}
                days={days}
                canEdit={canEdit}
                workItemId={workItemId}
                onUpdated={() => queryClient.invalidateQueries({ queryKey: ['timeline', workItemId] })}
              />
            ))}
            {tasks.length === 0 && (
              <div style={{ height: ROW_HEIGHT * 4 }} className="flex items-center justify-center text-muted-foreground/30 text-sm">
                Add rows to see the timeline
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {(addModalOpen || editTask) && (
          <TaskFormModal
            workItemId={workItemId}
            task={editTask}
            onClose={() => { setAddModalOpen(false); setEditTask(null) }}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ['timeline', workItemId] })
              setAddModalOpen(false)
              setEditTask(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}


// ─── Date Header ─────────────────────────────────────────────────────────────
function DateHeader({ days }: { days: Date[] }) {
  // Group days by month
  const months: { label: string; count: number }[] = []
  let currentMonth = ''
  let count = 0
  days.forEach(d => {
    const m = format(d, 'MMM yyyy')
    if (m !== currentMonth) {
      if (currentMonth) months.push({ label: currentMonth, count })
      currentMonth = m
      count = 1
    } else {
      count++
    }
  })
  if (currentMonth) months.push({ label: currentMonth, count })

  return (
    <div className="sticky top-0 z-10 bg-card border-b border-border" style={{ height: 56 }}>
      {/* Month row */}
      <div className="flex border-b border-border/50" style={{ height: 24 }}>
        {months.map((m, i) => (
          <div
            key={i}
            className="flex-shrink-0 px-2 flex items-center text-[10px] font-semibold text-muted-foreground border-r border-border/50 bg-muted/30"
            style={{ width: m.count * COL_WIDTH }}
          >
            {m.label}
          </div>
        ))}
      </div>
      {/* Day row */}
      <div className="flex" style={{ height: 32 }}>
        {days.map((d, i) => {
          const today = isToday(d)
          const isSun = d.getDay() === 0
          const isSat = d.getDay() === 6
          return (
            <div
              key={i}
              className={cn(
                'flex-shrink-0 flex flex-col items-center justify-center border-r border-border/30 text-[10px]',
                today ? 'bg-primary/10 text-primary font-bold' : '',
                (isSun || isSat) ? 'bg-muted/20 text-muted-foreground/50' : 'text-muted-foreground',
              )}
              style={{ width: COL_WIDTH }}
            >
              <span>{format(d, 'EEE')[0]}</span>
              <span className={cn('font-medium', today ? 'text-primary' : '')}>{format(d, 'd')}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}


// ─── Sidebar Row (with drag handle + edit/delete) ─────────────────────────────
function SidebarRow({
  task, canEdit, onEdit, onDelete,
}: {
  task: TimelineTask
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const color = COLORS[task.color]
  const dur = differenceInCalendarDays(new Date(task.endDate), new Date(task.startDate)) + 1

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, height: ROW_HEIGHT }}
      className={cn(
        'flex items-center gap-2 px-3 border-b border-border/50 group hover:bg-muted/30 transition-colors',
        isDragging ? 'opacity-50 bg-muted/50 z-50' : '',
      )}
    >
      {canEdit && (
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical size={14} />
        </button>
      )}
      <div className={cn('w-2.5 h-2.5 rounded-sm flex-shrink-0', color.bar)} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{task.label}</p>
        <p className="text-[10px] text-muted-foreground">
          {format(new Date(task.startDate), 'dd MMM')} – {format(new Date(task.endDate), 'dd MMM')} · {dur}d
        </p>
      </div>
      {canEdit && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={onEdit} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <Edit2 size={11} />
          </button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors">
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  )
}


// ─── Gantt Row (the actual bar grid) ─────────────────────────────────────────
function GanttRow({
  task, days, canEdit, workItemId, onUpdated,
}: {
  task: TimelineTask
  days: Date[]
  canEdit: boolean
  workItemId: string
  onUpdated: () => void
}) {
  const queryClient = useQueryClient()
  const color = COLORS[task.color]
  const taskStart = startOfDay(new Date(task.startDate))
  const taskEnd = startOfDay(new Date(task.endDate))
  const firstDay = days[0]

  const startOffset = differenceInCalendarDays(taskStart, firstDay)
  const dur = differenceInCalendarDays(taskEnd, taskStart) + 1

  // Drag state
  const dragRef = useRef<{ type: 'move' | 'resize-left' | 'resize-right'; startX: number; origStart: Date; origEnd: Date } | null>(null)

  const updateMut = useMutation({
    mutationFn: (data: { startDate?: string; endDate?: string }) =>
      apiPatch(`/api/timeline/${workItemId}/${task.id}`, data),
    onSuccess: () => onUpdated(),
    onError: () => toast.error('Failed to update task dates'),
  })

  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'move' | 'resize-left' | 'resize-right') => {
    if (!canEdit) return
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      type,
      startX: e.clientX,
      origStart: taskStart,
      origEnd: taskEnd,
    }

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const deltaX = ev.clientX - dragRef.current.startX
      const deltaDays = Math.round(deltaX / COL_WIDTH)
      if (deltaDays === 0) return

      let newStart = dragRef.current.origStart
      let newEnd = dragRef.current.origEnd

      if (type === 'move') {
        newStart = addDays(dragRef.current.origStart, deltaDays)
        newEnd = addDays(dragRef.current.origEnd, deltaDays)
      } else if (type === 'resize-left') {
        newStart = addDays(dragRef.current.origStart, deltaDays)
        if (newStart >= newEnd) newStart = addDays(newEnd, -1)
      } else {
        newEnd = addDays(dragRef.current.origEnd, deltaDays)
        if (newEnd <= newStart) newEnd = addDays(newStart, 1)
      }

      // Optimistic update in cache
      queryClient.setQueryData(['timeline', workItemId], (old: any) => ({
        ...old,
        data: {
          ...old.data,
          tasks: old.data.tasks.map((t: TimelineTask) =>
            t.id === task.id
              ? { ...t, startDate: newStart.toISOString(), endDate: newEnd.toISOString() }
              : t,
          ),
        },
      }))
    }

    const onMouseUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      if (!dragRef.current) return
      const deltaX = ev.clientX - dragRef.current.startX
      const deltaDays = Math.round(deltaX / COL_WIDTH)
      if (deltaDays !== 0) {
        let newStart = dragRef.current.origStart
        let newEnd = dragRef.current.origEnd
        if (type === 'move') {
          newStart = addDays(dragRef.current.origStart, deltaDays)
          newEnd = addDays(dragRef.current.origEnd, deltaDays)
        } else if (type === 'resize-left') {
          newStart = addDays(dragRef.current.origStart, deltaDays)
          if (newStart >= newEnd) newStart = addDays(newEnd, -1)
        } else {
          newEnd = addDays(dragRef.current.origEnd, deltaDays)
          if (newEnd <= newStart) newEnd = addDays(newStart, 1)
        }
        updateMut.mutate({
          startDate: format(newStart, 'yyyy-MM-dd'),
          endDate: format(newEnd, 'yyyy-MM-dd'),
        })
      }
      dragRef.current = null
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [canEdit, task.id, taskStart, taskEnd, workItemId, queryClient, updateMut])


  return (
    <div
      className="relative border-b border-border/50 hover:bg-muted/10 transition-colors group"
      style={{ height: ROW_HEIGHT, minWidth: days.length * COL_WIDTH }}
    >
      {/* Weekend shading */}
      {days.map((d, i) => (
        (d.getDay() === 0 || d.getDay() === 6) ? (
          <div key={i} className="absolute inset-y-0 bg-muted/20" style={{ left: i * COL_WIDTH, width: COL_WIDTH }} />
        ) : null
      ))}
      {/* Today line */}
      {days.map((d, i) => (
        isToday(d) ? (
          <div key={`today-${i}`} className="absolute inset-y-0 w-px bg-primary/60 z-10" style={{ left: i * COL_WIDTH + COL_WIDTH / 2 }} />
        ) : null
      ))}
      {/* Column grid lines */}
      {days.map((_, i) => (
        <div key={`grid-${i}`} className="absolute inset-y-0 w-px bg-border/30" style={{ left: (i + 1) * COL_WIDTH - 1 }} />
      ))}

      {/* The bar — only render if in view */}
      {startOffset + dur > 0 && startOffset < days.length && (
        <div
          className={cn(
            'absolute top-3 rounded-md flex items-center select-none shadow-sm',
            'border',
            color.bar, color.border, color.text,
            canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
          )}
          style={{
            left: Math.max(startOffset, 0) * COL_WIDTH + 2,
            width: Math.min(dur - Math.max(-startOffset, 0), days.length - Math.max(startOffset, 0)) * COL_WIDTH - 4,
            height: ROW_HEIGHT - 24,
          }}
          onMouseDown={e => handleMouseDown(e, 'move')}
        >
          {/* Resize left handle */}
          {canEdit && (
            <div
              className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-l-md hover:bg-black/20 flex items-center justify-center"
              onMouseDown={e => handleMouseDown(e, 'resize-left')}
            >
              <div className="w-0.5 h-3 bg-white/50 rounded-full" />
            </div>
          )}
          {/* Label */}
          <span className="flex-1 px-3 text-xs font-medium truncate pointer-events-none select-none">
            {task.label}
          </span>
          {/* Resize right handle */}
          {canEdit && (
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-r-md hover:bg-black/20 flex items-center justify-center"
              onMouseDown={e => handleMouseDown(e, 'resize-right')}
            >
              <div className="w-0.5 h-3 bg-white/50 rounded-full" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}


// ─── Task Form Modal ──────────────────────────────────────────────────────────
function TaskFormModal({
  workItemId, task, onClose, onSaved,
}: {
  workItemId: string
  task: TimelineTask | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!task
  const [label, setLabel] = useState(task?.label ?? '')
  const [startDate, setStartDate] = useState(
    task ? format(new Date(task.startDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  )
  const [endDate, setEndDate] = useState(
    task ? format(new Date(task.endDate), 'yyyy-MM-dd') : format(addDays(new Date(), 6), 'yyyy-MM-dd')
  )
  const [color, setColor] = useState<TaskColor>(task?.color ?? 'blue')
  const [priority, setPriority] = useState(task?.priority ?? 'medium')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const saveMut = useMutation({
    mutationFn: (payload: any) => isEdit
      ? apiPatch(`/api/timeline/${workItemId}/${task!.id}`, payload)
      : apiPost(`/api/timeline/${workItemId}`, payload),
    onSuccess: () => { toast.success(isEdit ? 'Task updated' : 'Task added'); onSaved() },
    onError: () => toast.error('Failed to save task'),
  })

  const validate = () => {
    const e: Record<string, string> = {}
    if (!label.trim()) e.label = 'Label is required'
    if (!startDate) e.startDate = 'Start date is required'
    if (!endDate) e.endDate = 'End date is required'
    if (startDate && endDate && startDate > endDate) e.endDate = 'End date must be after start date'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    saveMut.mutate({ label: label.trim(), startDate, endDate, color, priority, notes: notes || null })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">{isEdit ? 'Edit Task' : 'Add Timeline Task'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Label */}
          <div>
            <label className="label">Label *</label>
            <input value={label} onChange={e => setLabel(e.target.value)} className="input" placeholder="e.g. Technical Assessment" />
            {errors.label && <p className="text-xs text-red-500 mt-1">{errors.label}</p>}
          </div>
          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date *</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" />
              {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
            </div>
            <div>
              <label className="label">End Date *</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" />
              {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
            </div>
          </div>
          {/* Color picker */}
          <div>
            <label className="label">Color</label>
            <div className="flex gap-2 mt-1">
              {(Object.keys(COLORS) as TaskColor[]).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn('w-7 h-7 rounded-full transition-transform flex items-center justify-center', COLORS[c].bar, color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105')}
                  title={COLORS[c].label}
                >
                  {color === c && <Check size={12} className="text-white" />}
                </button>
              ))}
            </div>
          </div>
          {/* Priority */}
          <div>
            <label className="label">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} className="input">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          {/* Notes */}
          <div>
            <label className="label">Notes <span className="text-muted-foreground">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input resize-none" rows={2} placeholder="Additional notes..." />
          </div>
          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saveMut.isPending} className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm">
              {saveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {isEdit ? 'Update' : 'Add Task'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}


// ─── Skeleton ─────────────────────────────────────────────────────────────────
function TimelineSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-background animate-pulse">
      <div className="h-14 border-b border-border bg-card flex items-center px-5 gap-3">
        <div className="h-4 bg-muted rounded w-24" />
        <div className="h-4 bg-muted rounded w-48" />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 border-r border-border bg-card p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded-lg" />
          ))}
        </div>
        <div className="flex-1 p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded-lg" style={{ width: `${40 + i * 12}%`, marginLeft: `${i * 8}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
