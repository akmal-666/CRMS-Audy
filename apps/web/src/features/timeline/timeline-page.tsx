'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, Loader2, GripVertical, Trash2, Edit2,
  ChevronLeft, ChevronRight, Calendar, X, Check, Search,
  Filter, ZoomIn, ZoomOut, Share2, MoreHorizontal, SlidersHorizontal,
  ChevronDown, Eye, EyeOff, Info,
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/context/auth-context'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { cn, STATUS_LABELS, STATUS_COLORS, getInitials } from '@/lib/utils'
import { WorkflowStatus, UserRole } from '@crms/types'
import { toast } from 'sonner'
import {
  addDays, format, differenceInCalendarDays,
  isToday, startOfDay, getWeek,
} from 'date-fns'
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE_COL_WIDTH = 36
const ROW_HEIGHT = 48
const SIDEBAR_WIDTH = 280
const DAYS_TOTAL = 120

const COLORS = {
  blue:   { bar: 'bg-blue-500',    border: 'border-blue-600',    hex: '#3b82f6', text: 'text-white', label: 'Blue'   },
  green:  { bar: 'bg-emerald-500', border: 'border-emerald-600', hex: '#10b981', text: 'text-white', label: 'Green'  },
  yellow: { bar: 'bg-amber-400',   border: 'border-amber-500',   hex: '#fbbf24', text: 'text-white', label: 'Yellow' },
  orange: { bar: 'bg-orange-500',  border: 'border-orange-600',  hex: '#f97316', text: 'text-white', label: 'Orange' },
  red:    { bar: 'bg-red-500',     border: 'border-red-600',     hex: '#ef4444', text: 'text-white', label: 'Red'    },
  purple: { bar: 'bg-violet-500',  border: 'border-violet-600',  hex: '#8b5cf6', text: 'text-white', label: 'Purple' },
} as const
type TaskColor = keyof typeof COLORS

const TASK_STATUSES = {
  not_started: { label: 'Not Started', dot: 'bg-slate-400',  chip: 'bg-slate-100 text-slate-600'   },
  in_progress: { label: 'In Progress', dot: 'bg-blue-500',   chip: 'bg-blue-100 text-blue-700'     },
  completed:   { label: 'Completed',   dot: 'bg-green-500',  chip: 'bg-green-100 text-green-700'   },
  on_hold:     { label: 'On Hold',     dot: 'bg-amber-500',  chip: 'bg-amber-100 text-amber-700'   },
  delayed:     { label: 'Delayed',     dot: 'bg-red-500',    chip: 'bg-red-100 text-red-700'       },
  milestone:   { label: 'Milestone',   dot: 'bg-violet-500', chip: 'bg-violet-100 text-violet-700' },
} as const
type TaskStatus = keyof typeof TASK_STATUSES

// Fields config — which sidebar columns to show
const FIELD_DEFS = {
  status:   { label: 'Status',   default: true  },
  date:     { label: 'Date',     default: true  },
  assignee: { label: 'Assignee', default: true  },
  priority: { label: 'Priority', default: false },
  notes:    { label: 'Notes',    default: false },
} as const
type FieldKey = keyof typeof FIELD_DEFS

interface TimelineTask {
  id: string
  workItemId: string
  label: string
  startDate: string
  endDate: string
  color: TaskColor
  status: TaskStatus
  priority: string
  notes?: string | null
  sortOrder: number
  assignee?: { id: string; name: string; avatarUrl?: string | null } | null
}

interface WorkItemInfo {
  id: string
  ticketNumber: string
  title: string
  status: string
  priority: string
  department?: { name: string }
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, avatarUrl, size = 20 }: { name: string; avatarUrl?: string | null; size?: number }) {
  if (avatarUrl) return <img src={avatarUrl} alt={name} style={{ width: size, height: size }} className="rounded-full object-cover flex-shrink-0" />
  return (
    <div style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      className="rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold flex-shrink-0 uppercase select-none">
      {getInitials(name)}
    </div>
  )
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
function Tooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
            <div className="bg-popover border border-border rounded-xl shadow-xl p-3 text-xs min-w-[180px] max-w-[240px]">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Bar Tooltip Content ──────────────────────────────────────────────────────
function BarTooltipContent({ task }: { task: TimelineTask }) {
  const dur = differenceInCalendarDays(new Date(task.endDate), new Date(task.startDate)) + 1
  const statusInfo = TASK_STATUSES[task.status] ?? TASK_STATUSES.not_started
  return (
    <div className="space-y-2">
      <p className="font-semibold text-foreground leading-snug">{task.label}</p>
      <div className="flex items-center gap-1.5">
        <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full', statusInfo.chip)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', statusInfo.dot)} />
          {statusInfo.label}
        </span>
      </div>
      <div className="space-y-1 text-[11px] text-muted-foreground">
        <div className="flex justify-between gap-4">
          <span>Start</span>
          <span className="font-medium text-foreground">{format(new Date(task.startDate), 'dd MMM yyyy')}</span>
        </div>
        {task.status !== 'milestone' && (
          <div className="flex justify-between gap-4">
            <span>End</span>
            <span className="font-medium text-foreground">{format(new Date(task.endDate), 'dd MMM yyyy')}</span>
          </div>
        )}
        {task.status !== 'milestone' && (
          <div className="flex justify-between gap-4">
            <span>Duration</span>
            <span className="font-medium text-foreground">{dur}d</span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span>Priority</span>
          <span className="font-medium text-foreground capitalize">{task.priority}</span>
        </div>
        {task.assignee && (
          <div className="flex justify-between gap-4">
            <span>Assignee</span>
            <span className="font-medium text-foreground">{task.assignee.name}</span>
          </div>
        )}
        {task.notes && (
          <div className="pt-1 border-t border-border">
            <p className="text-foreground/70 italic leading-relaxed">{task.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Fields Dropdown ──────────────────────────────────────────────────────────
function FieldsDropdown({ fields, onChange }: { fields: Set<FieldKey>; onChange: (f: Set<FieldKey>) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (key: FieldKey) => {
    const next = new Set(fields)
    if (next.has(key)) next.delete(key); else next.add(key)
    onChange(next)
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs font-medium border border-border rounded-lg px-2 py-1.5 bg-background hover:bg-muted transition-colors">
        <SlidersHorizontal size={12} /> Fields
        <span className="text-[10px] text-muted-foreground ml-0.5">Default</span>
        <ChevronDown size={11} className={cn('text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-xl p-2 min-w-[150px]">
            {(Object.entries(FIELD_DEFS) as [FieldKey, typeof FIELD_DEFS[FieldKey]][]).map(([key, def]) => (
              <button key={key} onClick={() => toggle(key)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors text-xs text-foreground">
                <div className={cn('w-4 h-4 rounded flex items-center justify-center border transition-colors flex-shrink-0',
                  fields.has(key) ? 'bg-primary border-primary' : 'border-border')}>
                  {fields.has(key) && <Check size={10} className="text-white" />}
                </div>
                {def.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── More Menu ────────────────────────────────────────────────────────────────
function MoreMenu({ workItem }: { workItem?: WorkItemInfo }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs font-medium border border-border rounded-lg px-2.5 py-1.5 bg-background hover:bg-muted transition-colors">
        <MoreHorizontal size={14} />
        <span>More</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-xl p-2 min-w-[160px]">
            {[
              { label: 'Export as PNG',  icon: <Eye size={13} /> },
              { label: 'Export as PDF',  icon: <Eye size={13} /> },
              { label: 'Print Timeline', icon: <Eye size={13} /> },
            ].map(item => (
              <button key={item.label} onClick={() => { toast.info(`${item.label} coming soon`); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors text-xs text-foreground">
                <span className="text-muted-foreground">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Filters Panel ────────────────────────────────────────────────────────────
function FiltersPanel({ filterStatus, setFilterStatus, filterColor, setFilterColor, onClear }: {
  filterStatus: TaskStatus | 'all'; setFilterStatus: (s: TaskStatus | 'all') => void
  filterColor: TaskColor | 'all';   setFilterColor: (c: TaskColor | 'all') => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const hasFilter = filterStatus !== 'all' || filterColor !== 'all'

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={cn('flex items-center gap-1.5 text-xs font-medium border rounded-lg px-2.5 py-1.5 transition-colors',
          hasFilter ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background hover:bg-muted text-foreground')}>
        <Filter size={12} /> Filters
        {hasFilter && <span className="ml-0.5 bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]">!</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="absolute left-0 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-xl p-3 min-w-[200px] space-y-3">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Status</p>
              <div className="flex flex-wrap gap-1">
                <button onClick={() => setFilterStatus('all')}
                  className={cn('text-[10px] px-2 py-0.5 rounded-full border transition-colors',
                    filterStatus === 'all' ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-muted')}>
                  All
                </button>
                {(Object.keys(TASK_STATUSES) as TaskStatus[]).map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={cn('text-[10px] px-2 py-0.5 rounded-full border transition-colors',
                      filterStatus === s ? cn(TASK_STATUSES[s].chip, 'border-transparent') : 'border-border hover:bg-muted')}>
                    {TASK_STATUSES[s].label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Color</p>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setFilterColor('all')}
                  className={cn('text-[10px] px-2 py-0.5 rounded-full border transition-colors',
                    filterColor === 'all' ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-muted')}>
                  All
                </button>
                {(Object.keys(COLORS) as TaskColor[]).map(c => (
                  <button key={c} onClick={() => setFilterColor(c)}
                    className={cn('w-5 h-5 rounded-full transition-transform', COLORS[c].bar, filterColor === c ? 'ring-2 ring-offset-1 ring-primary scale-110' : 'hover:scale-105')} />
                ))}
              </div>
            </div>
            {hasFilter && (
              <button onClick={() => { onClear(); setOpen(false) }}
                className="w-full text-[10px] text-red-500 hover:text-red-600 border border-red-200 rounded-lg py-1 hover:bg-red-50 transition-colors">
                Clear Filters
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function TimelinePage({ workItemId }: { workItemId: string }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canEdit = user?.role !== UserRole.BUSINESS_USER

  const [windowStart, setWindowStart] = useState(() => addDays(startOfDay(new Date()), -14))
  const [zoom, setZoom] = useState(100)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [filterColor, setFilterColor] = useState<TaskColor | 'all'>('all')
  const [visibleFields, setVisibleFields] = useState<Set<FieldKey>>(
    new Set(Object.entries(FIELD_DEFS).filter(([, v]) => v.default).map(([k]) => k as FieldKey))
  )
  const [collapsed, setCollapsed] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editTask, setEditTask] = useState<TimelineTask | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const colWidth = Math.round(BASE_COL_WIDTH * zoom / 100)

  const { data, isLoading } = useQuery({
    queryKey: ['timeline', workItemId],
    queryFn: () => apiGet<{ workItem: WorkItemInfo; tasks: TimelineTask[] }>(`/api/timeline/${workItemId}`),
  })

  const workItem = data?.data?.workItem
  const allTasks = useMemo(() => data?.data?.tasks ?? [], [data?.data?.tasks])

  const tasks = useMemo(() => {
    let t = allTasks
    if (search) t = t.filter(x => x.label.toLowerCase().includes(search.toLowerCase()))
    if (filterStatus !== 'all') t = t.filter(x => x.status === filterStatus)
    if (filterColor !== 'all') t = t.filter(x => x.color === filterColor)
    return t
  }, [allTasks, search, filterStatus, filterColor])

  useEffect(() => {
    const todayOffset = differenceInCalendarDays(new Date(), windowStart)
    if (gridRef.current && todayOffset >= 0) {
      gridRef.current.scrollLeft = Math.max(0, todayOffset * colWidth - 160)
    }
  }, [windowStart, colWidth])

  const shiftDays = (n: number) => setWindowStart(d => addDays(d, n))
  const goToToday  = () => setWindowStart(addDays(startOfDay(new Date()), -14))

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => toast.success('Link copied to clipboard'))
  }

  const deleteMut = useMutation({
    mutationFn: (taskId: string) => apiDelete(`/api/timeline/${workItemId}/${taskId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['timeline', workItemId] }); toast.success('Task deleted') },
    onError: () => toast.error('Failed to delete task'),
  })

  const reorderMut = useMutation({
    mutationFn: (order: { id: string; sortOrder: number }[]) => apiPatch(`/api/timeline/${workItemId}/reorder`, { order }),
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = tasks.findIndex(t => t.id === active.id)
    const newIndex = tasks.findIndex(t => t.id === over.id)
    const reordered = arrayMove(tasks, oldIndex, newIndex)
    queryClient.setQueryData(['timeline', workItemId], (old: any) => ({
      ...old, data: { ...old.data, tasks: reordered.map((t, i) => ({ ...t, sortOrder: i })) },
    }))
    reorderMut.mutate(reordered.map((t, i) => ({ id: t.id, sortOrder: i })))
  }, [tasks, workItemId, queryClient, reorderMut])

  const days = useMemo(() => Array.from({ length: DAYS_TOTAL }, (_, i) => addDays(windowStart, i)), [windowStart])

  if (isLoading) return <TimelineSkeleton />

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border bg-card gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/kanban" className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0">
            <ArrowLeft size={15} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-muted-foreground">{workItem?.ticketNumber}</span>
              {workItem && (
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', STATUS_COLORS[workItem.status as WorkflowStatus])}>
                  {STATUS_LABELS[workItem.status as WorkflowStatus]}
                </span>
              )}
            </div>
            <h1 className="text-sm font-semibold text-foreground truncate">{workItem?.title ?? 'Timeline'}</h1>
            <p className="text-[10px] text-muted-foreground">Project Timeline</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Share */}
          <button onClick={handleShare}
            className="flex items-center gap-1.5 text-xs font-medium border border-border rounded-lg px-2.5 py-1.5 bg-background hover:bg-muted transition-colors">
            <Share2 size={13} /> Share
          </button>

          {/* Filters */}
          <FiltersPanel
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterColor={filterColor} setFilterColor={setFilterColor}
            onClear={() => { setFilterStatus('all'); setFilterColor('all') }}
          />

          {/* More */}
          <MoreMenu workItem={workItem} />

          <div className="w-px h-5 bg-border mx-0.5" />

          {/* Today nav */}
          <button onClick={() => shiftDays(-7)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><ChevronLeft size={15} /></button>
          <button onClick={goToToday} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1.5">
            <Calendar size={11} /> Today
          </button>
          <button onClick={() => shiftDays(7)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><ChevronRight size={15} /></button>

          <div className="w-px h-5 bg-border mx-0.5" />

          {canEdit && (
            <button onClick={() => setAddModalOpen(true)} className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5">
              <Plus size={13} /> Add Row
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 border-b border-border bg-card/50">
        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search task or milestone"
            className="pl-7 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 w-52" />
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {/* View */}
          <span className="text-xs text-muted-foreground">View</span>
          <span className="text-xs font-medium border border-border rounded-lg px-2 py-1.5 bg-background">Timeline</span>
          <div className="w-px h-4 bg-border" />

          {/* Scale */}
          <span className="text-xs text-muted-foreground">Scale</span>
          <span className="text-xs font-medium border border-border rounded-lg px-2 py-1.5 bg-background">Weeks</span>
          <div className="w-px h-4 bg-border" />

          {/* Fields */}
          <FieldsDropdown fields={visibleFields} onChange={setVisibleFields} />
          <div className="w-px h-4 bg-border" />

          {/* Zoom */}
          <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"><ZoomOut size={13} /></button>
          <span className="text-xs font-medium w-10 text-center">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"><ZoomIn size={13} /></button>
          <button onClick={() => setZoom(100)} className="text-xs px-2 py-1.5 border border-border rounded-lg hover:bg-muted transition-colors">Fit to View</button>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="flex-shrink-0 border-r border-border bg-card flex flex-col" style={{ width: collapsed ? 40 : SIDEBAR_WIDTH }}>
          {collapsed ? (
            <div className="flex flex-col items-center pt-3 gap-2">
              <button onClick={() => setCollapsed(false)} className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          ) : (
            <>
              <div className="flex-shrink-0 border-b border-border px-3 py-2 flex items-center justify-between" style={{ height: 56 }}>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Task / Milestone</span>
                <button onClick={() => setCollapsed(true)} className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors">
                  <ChevronLeft size={13} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                  <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                        <Calendar size={28} className="text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No tasks yet</p>
                        {canEdit && <p className="text-xs text-muted-foreground/60 mt-1">Click &quot;Add Row&quot; to get started</p>}
                      </div>
                    ) : tasks.map(task => (
                      <SidebarRow key={task.id} task={task} canEdit={canEdit} visibleFields={visibleFields}
                        onEdit={() => setEditTask(task)}
                        onDelete={() => deleteMut.mutate(task.id)}
                        onStatusChange={(status) => {
                          apiPatch(`/api/timeline/${workItemId}/${task.id}`, { status })
                            .then(() => queryClient.invalidateQueries({ queryKey: ['timeline', workItemId] }))
                        }}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
              {canEdit && (
                <div className="flex-shrink-0 border-t border-border p-3">
                  <button onClick={() => setAddModalOpen(true)}
                    className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-muted">
                    <Plus size={13} /> Add Task / Milestone
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Gantt grid */}
        <div ref={gridRef} className="flex-1 overflow-x-auto overflow-y-auto">
          <div style={{ width: days.length * colWidth, minWidth: '100%' }}>
            <DateHeader days={days} colWidth={colWidth} />
            {tasks.map(task => (
              <GanttRow key={task.id} task={task} days={days} colWidth={colWidth}
                canEdit={canEdit} workItemId={workItemId}
                onUpdated={() => queryClient.invalidateQueries({ queryKey: ['timeline', workItemId] })}
              />
            ))}
            {tasks.length === 0 && (
              <div style={{ height: ROW_HEIGHT * 5 }} className="flex items-center justify-center text-muted-foreground/30 text-sm">
                Add rows to see the timeline
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex-shrink-0 border-t border-border bg-card px-4 py-2 flex items-center gap-5 flex-wrap">
        {(Object.entries(TASK_STATUSES) as [TaskStatus, typeof TASK_STATUSES[TaskStatus]][]).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5 cursor-pointer" onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}>
            {key === 'milestone'
              ? <div className="w-2.5 h-2.5 rotate-45 bg-violet-500 flex-shrink-0" style={{ borderRadius: 1 }} />
              : <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', val.dot)} />
            }
            <span className={cn('text-xs transition-colors', filterStatus === key ? 'text-foreground font-medium' : 'text-muted-foreground')}>
              {val.label}
            </span>
          </div>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          {tasks.length !== allTasks.length && ` (filtered from ${allTasks.length})`}
        </span>
      </div>

      <AnimatePresence>
        {(addModalOpen || editTask) && (
          <TaskFormModal workItemId={workItemId} task={editTask}
            onClose={() => { setAddModalOpen(false); setEditTask(null) }}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ['timeline', workItemId] })
              setAddModalOpen(false); setEditTask(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Date Header ──────────────────────────────────────────────────────────────
function DateHeader({ days, colWidth }: { days: Date[]; colWidth: number }) {
  const months: { label: string; count: number }[] = []
  let curMonth = ''; let mCount = 0
  days.forEach(d => {
    const m = format(d, 'MMM yyyy')
    if (m !== curMonth) { if (curMonth) months.push({ label: curMonth, count: mCount }); curMonth = m; mCount = 1 } else mCount++
  })
  if (curMonth) months.push({ label: curMonth, count: mCount })

  const weeks: { label: string; count: number }[] = []
  let curWeek = -1; let wCount = 0
  days.forEach(d => {
    const w = getWeek(d)
    if (w !== curWeek) { if (curWeek !== -1) weeks.push({ label: `W${curWeek}`, count: wCount }); curWeek = w; wCount = 1 } else wCount++
  })
  if (curWeek !== -1) weeks.push({ label: `W${curWeek}`, count: wCount })

  return (
    <div className="sticky top-0 z-10 bg-card border-b border-border" style={{ height: 56 }}>
      <div className="flex border-b border-border/50" style={{ height: 20 }}>
        {months.map((m, i) => (
          <div key={i} className="flex-shrink-0 px-2 flex items-center text-[10px] font-semibold text-muted-foreground border-r border-border/50 bg-muted/30" style={{ width: m.count * colWidth }}>
            {m.label}
          </div>
        ))}
      </div>
      <div className="flex border-b border-border/40" style={{ height: 16 }}>
        {weeks.map((w, i) => (
          <div key={i} className="flex-shrink-0 px-1.5 flex items-center text-[9px] font-bold text-muted-foreground/70 border-r border-border/40 bg-muted/10 uppercase tracking-wider" style={{ width: w.count * colWidth }}>
            {w.label}
          </div>
        ))}
      </div>
      <div className="flex" style={{ height: 20 }}>
        {days.map((d, i) => {
          const today = isToday(d)
          const isWeekend = d.getDay() === 0 || d.getDay() === 6
          return (
            <div key={i} style={{ width: colWidth }}
              className={cn('flex-shrink-0 flex flex-col items-center justify-center border-r border-border/20 text-[9px]',
                today ? 'bg-primary/15 text-primary font-bold' : '',
                isWeekend ? 'bg-muted/20 text-muted-foreground/40' : 'text-muted-foreground')}>
              {colWidth >= 28 && <span className="leading-none">{format(d, 'EEE')[0]}</span>}
              <span className={cn('font-medium leading-none', today && 'text-primary')}>{format(d, 'd')}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Sidebar Row ──────────────────────────────────────────────────────────────
function SidebarRow({ task, canEdit, visibleFields, onEdit, onDelete, onStatusChange }: {
  task: TimelineTask; canEdit: boolean; visibleFields: Set<FieldKey>
  onEdit: () => void; onDelete: () => void; onStatusChange: (s: TaskStatus) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const color = COLORS[task.color]
  const statusInfo = TASK_STATUSES[task.status] ?? TASK_STATUSES.not_started
  const dur = differenceInCalendarDays(new Date(task.endDate), new Date(task.startDate)) + 1
  const isMilestone = task.status === 'milestone'

  return (
    <div ref={setNodeRef} style={{ ...style, height: ROW_HEIGHT }}
      className={cn('flex items-center gap-2 px-3 border-b border-border/50 group hover:bg-muted/30 transition-colors',
        isDragging ? 'opacity-50 bg-muted/50 z-50' : '')}>
      {canEdit && (
        <button {...attributes} {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical size={13} />
        </button>
      )}

      {/* Color + milestone indicator */}
      {isMilestone
        ? <div className={cn('w-3 h-3 rotate-45 flex-shrink-0', color.bar)} style={{ borderRadius: 2 }} />
        : <div className={cn('w-3 h-3 rounded-full flex-shrink-0', color.bar)} />
      }

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{task.label}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {visibleFields.has('status') && (
            <span className={cn('inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full', statusInfo.chip)}>
              <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', statusInfo.dot)} />
              {statusInfo.label}
            </span>
          )}
          {visibleFields.has('date') && !isMilestone && (
            <span className="text-[10px] text-muted-foreground">{format(new Date(task.startDate), 'dd MMM')} – {format(new Date(task.endDate), 'dd MMM')} · {dur}d</span>
          )}
          {visibleFields.has('date') && isMilestone && (
            <span className="text-[10px] text-muted-foreground">{format(new Date(task.startDate), 'dd MMM yyyy')}</span>
          )}
          {visibleFields.has('priority') && (
            <span className="text-[9px] text-muted-foreground capitalize border border-border rounded px-1">{task.priority}</span>
          )}
        </div>
      </div>

      {visibleFields.has('assignee') && task.assignee && (
        <Avatar name={task.assignee.name} avatarUrl={task.assignee.avatarUrl} size={20} />
      )}

      {canEdit && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={onEdit} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 size={11} /></button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"><Trash2 size={11} /></button>
        </div>
      )}
    </div>
  )
}

// ─── Gantt Row ────────────────────────────────────────────────────────────────
function GanttRow({ task, days, colWidth, canEdit, workItemId, onUpdated }: {
  task: TimelineTask; days: Date[]; colWidth: number
  canEdit: boolean; workItemId: string; onUpdated: () => void
}) {
  const queryClient = useQueryClient()
  const color = COLORS[task.color]
  const isMilestone = task.status === 'milestone'
  const taskStart = startOfDay(new Date(task.startDate))
  const taskEnd = startOfDay(new Date(task.endDate))
  const firstDay = days[0]
  const startOffset = differenceInCalendarDays(taskStart, firstDay)
  const dur = isMilestone ? 1 : differenceInCalendarDays(taskEnd, taskStart) + 1
  const barWidth = Math.min(dur - Math.max(-startOffset, 0), days.length - Math.max(startOffset, 0)) * colWidth - 4
  const dragRef = useRef<{ type: 'move' | 'resize-left' | 'resize-right'; startX: number; origStart: Date; origEnd: Date } | null>(null)

  const updateMut = useMutation({
    mutationFn: (d: { startDate?: string; endDate?: string }) => apiPatch(`/api/timeline/${workItemId}/${task.id}`, d),
    onSuccess: () => onUpdated(),
    onError: () => toast.error('Failed to update task dates'),
  })

  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'move' | 'resize-left' | 'resize-right') => {
    if (!canEdit || isMilestone) return
    e.preventDefault(); e.stopPropagation()
    dragRef.current = { type, startX: e.clientX, origStart: taskStart, origEnd: taskEnd }

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const delta = Math.round((ev.clientX - dragRef.current.startX) / colWidth)
      if (delta === 0) return
      let ns = dragRef.current.origStart, ne = dragRef.current.origEnd
      if (type === 'move') { ns = addDays(ns, delta); ne = addDays(ne, delta) }
      else if (type === 'resize-left') { ns = addDays(ns, delta); if (ns >= ne) ns = addDays(ne, -1) }
      else { ne = addDays(ne, delta); if (ne <= ns) ne = addDays(ns, 1) }
      queryClient.setQueryData(['timeline', workItemId], (old: any) => ({
        ...old, data: { ...old.data, tasks: old.data.tasks.map((t: TimelineTask) => t.id === task.id ? { ...t, startDate: ns.toISOString(), endDate: ne.toISOString() } : t) },
      }))
    }

    const onUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      if (!dragRef.current) return
      const delta = Math.round((ev.clientX - dragRef.current.startX) / colWidth)
      if (delta !== 0) {
        let ns = dragRef.current.origStart, ne = dragRef.current.origEnd
        if (type === 'move') { ns = addDays(ns, delta); ne = addDays(ne, delta) }
        else if (type === 'resize-left') { ns = addDays(ns, delta); if (ns >= ne) ns = addDays(ne, -1) }
        else { ne = addDays(ne, delta); if (ne <= ns) ne = addDays(ns, 1) }
        updateMut.mutate({ startDate: format(ns, 'yyyy-MM-dd'), endDate: format(ne, 'yyyy-MM-dd') })
      }
      dragRef.current = null
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [canEdit, isMilestone, task.id, taskStart, taskEnd, workItemId, queryClient, updateMut, colWidth])

  const inView = startOffset + dur > 0 && startOffset < days.length

  return (
    <div className="relative border-b border-border/50 hover:bg-muted/10 transition-colors"
      style={{ height: ROW_HEIGHT, minWidth: days.length * colWidth }}>
      {days.map((d, i) => (d.getDay() === 0 || d.getDay() === 6)
        ? <div key={i} className="absolute inset-y-0 bg-muted/20" style={{ left: i * colWidth, width: colWidth }} />
        : null
      )}
      {days.map((d, i) => isToday(d)
        ? <div key={`t${i}`} className="absolute inset-y-0 w-px bg-primary/60 z-10" style={{ left: i * colWidth + colWidth / 2 }} />
        : null
      )}
      {days.map((_, i) => <div key={`g${i}`} className="absolute inset-y-0 w-px bg-border/20" style={{ left: (i + 1) * colWidth - 1 }} />)}

      {inView && (
        isMilestone ? (
          // Diamond + label below
          <div className="absolute z-20 flex flex-col items-center"
            style={{ left: Math.max(startOffset, 0) * colWidth + colWidth / 2 - 10, top: ROW_HEIGHT / 2 - 10 }}>
            <Tooltip content={<BarTooltipContent task={task} />}>
              <div className={cn('w-5 h-5 rotate-45 cursor-pointer hover:scale-110 transition-transform', color.bar)} style={{ borderRadius: 2 }} />
            </Tooltip>
            {/* Vertical stem below diamond */}
            <div className="w-px h-2 bg-muted-foreground/30 mt-0.5" />
          </div>
        ) : (
          <Tooltip content={<BarTooltipContent task={task} />}>
            <div
              className={cn('absolute top-3 rounded-md flex items-center select-none shadow-sm border', color.bar, color.border, color.text,
                canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default')}
              style={{ left: Math.max(startOffset, 0) * colWidth + 2, width: Math.max(barWidth, colWidth - 4), height: ROW_HEIGHT - 24 }}
              onMouseDown={e => handleMouseDown(e, 'move')}>
              {canEdit && (
                <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-l-md hover:bg-black/20 flex items-center justify-center"
                  onMouseDown={e => handleMouseDown(e, 'resize-left')}>
                  <div className="w-0.5 h-3 bg-white/50 rounded-full" />
                </div>
              )}
              <span className="flex-1 px-3 text-xs font-medium truncate pointer-events-none select-none">
                {task.label} · {dur}d
              </span>
              {task.assignee && (
                <div className="mr-2 flex-shrink-0 pointer-events-none">
                  <Avatar name={task.assignee.name} avatarUrl={task.assignee.avatarUrl} size={16} />
                </div>
              )}
              {canEdit && (
                <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-r-md hover:bg-black/20 flex items-center justify-center"
                  onMouseDown={e => handleMouseDown(e, 'resize-right')}>
                  <div className="w-0.5 h-3 bg-white/50 rounded-full" />
                </div>
              )}
            </div>
          </Tooltip>
        )
      )}
    </div>
  )
}

// ─── Task Form Modal ──────────────────────────────────────────────────────────
function TaskFormModal({ workItemId, task, onClose, onSaved }: {
  workItemId: string; task: TimelineTask | null; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!task
  const [label, setLabel] = useState(task?.label ?? '')
  const [startDate, setStartDate] = useState(task ? format(new Date(task.startDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(task ? format(new Date(task.endDate), 'yyyy-MM-dd') : format(addDays(new Date(), 6), 'yyyy-MM-dd'))
  const [color, setColor] = useState<TaskColor>(task?.color ?? 'blue')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'not_started')
  const [priority, setPriority] = useState(task?.priority ?? 'medium')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const isMilestone = status === 'milestone'

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
    if (!startDate) e.startDate = 'Required'
    if (!isMilestone && !endDate) e.endDate = 'Required'
    if (!isMilestone && startDate && endDate && startDate > endDate) e.endDate = 'Must be after start date'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    saveMut.mutate({ label: label.trim(), startDate, endDate: isMilestone ? startDate : endDate, color, status, priority, notes: notes || null })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-sm font-semibold">{isEdit ? 'Edit Task' : 'Add Task / Milestone'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Label *</label>
            <input value={label} onChange={e => setLabel(e.target.value)} className="input" placeholder="e.g. Requirements Review" />
            {errors.label && <p className="text-xs text-red-500 mt-1">{errors.label}</p>}
          </div>

          <div>
            <label className="label">Status</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {(Object.keys(TASK_STATUSES) as TaskStatus[]).map(s => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                    status === s ? cn(TASK_STATUSES[s].chip, 'border-transparent ring-2 ring-offset-1 ring-primary/40') : 'border-border hover:bg-muted')}>
                  {s === 'milestone'
                    ? <div className={cn('w-2 h-2 rotate-45 flex-shrink-0', TASK_STATUSES[s].dot)} style={{ borderRadius: 1 }} />
                    : <div className={cn('w-2 h-2 rounded-full flex-shrink-0', TASK_STATUSES[s].dot)} />
                  }
                  {TASK_STATUSES[s].label}
                </button>
              ))}
            </div>
          </div>

          <div className={cn('grid gap-3', isMilestone ? 'grid-cols-1' : 'grid-cols-2')}>
            <div>
              <label className="label">{isMilestone ? 'Date *' : 'Start Date *'}</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" />
              {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
            </div>
            {!isMilestone && (
              <div>
                <label className="label">End Date *</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" />
                {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
              </div>
            )}
          </div>

          <div>
            <label className="label">Color</label>
            <div className="flex gap-2 mt-1">
              {(Object.keys(COLORS) as TaskColor[]).map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={cn('w-6 h-6 rounded-full transition-transform flex items-center justify-center', COLORS[c].bar, color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105')}>
                  {color === c && <Check size={11} className="text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} className="input">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="label">Notes <span className="text-muted-foreground">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input resize-none" rows={2} placeholder="Additional notes..." />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={saveMut.isPending} className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm">
              {saveMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
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
      <div className="h-14 border-b border-border bg-card" />
      <div className="h-10 border-b border-border bg-card/50" />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 border-r border-border bg-card p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 bg-muted rounded-lg" />)}
        </div>
        <div className="flex-1 p-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded-lg" style={{ width: `${40 + i * 8}%`, marginLeft: `${i * 5}%` }} />
          ))}
        </div>
      </div>
      <div className="h-9 border-t border-border bg-card" />
    </div>
  )
}
