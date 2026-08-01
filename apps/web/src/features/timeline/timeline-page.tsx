'use client'

import {
  useState, useRef, useCallback, useEffect, useMemo, useId,
} from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, Loader2, GripVertical, Trash2, Edit2,
  ChevronLeft, ChevronRight, Calendar, X, Check, Search,
  Filter, ZoomIn, ZoomOut, Share2, MoreHorizontal, SlidersHorizontal,
  ChevronDown, Link2, Copy, ExternalLink,
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
  dependsOn?: string | null   // id of predecessor task
  assignee?: { id: string; name: string; avatarUrl?: string | null } | null
}

interface WorkItemInfo {
  createdAt: string
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

// ─── Portal-based Tooltip (fixed positioning, works on mobile too) ────────────
function Tooltip({ children, content, disabled }: { children: React.ReactNode; content: React.ReactNode; disabled?: boolean }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPos({ x: rect.left + rect.width / 2, y: rect.top - 8 })
  }, [])

  if (disabled) return <>{children}</>

  return (
    <>
      <div ref={triggerRef}
        onMouseEnter={() => { updatePos(); setShow(true) }}
        onMouseLeave={() => setShow(false)}
        onTouchStart={() => { updatePos(); setShow(v => !v) }}
        className="contents">
        {children}
      </div>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.13 }}
            style={{ position: 'fixed', left: pos.x, top: pos.y, transform: 'translate(-50%, -100%)', zIndex: 9999 }}
            className="pointer-events-none">
            <div className="bg-popover border border-border rounded-xl shadow-2xl p-3 text-xs min-w-[180px] max-w-[240px] backdrop-blur-sm">
              {content}
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-popover border-r border-b border-border rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Bar Tooltip Content ──────────────────────────────────────────────────────
function BarTooltipContent({ task }: { task: TimelineTask }) {
  const dur = differenceInCalendarDays(new Date(task.endDate), new Date(task.startDate)) + 1
  const statusInfo = TASK_STATUSES[task.status] ?? TASK_STATUSES.not_started
  return (
    <div className="space-y-2">
      <p className="font-semibold text-foreground leading-snug">{task.label}</p>
      <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full', statusInfo.chip)}>
        <span className={cn('w-1.5 h-1.5 rounded-full', statusInfo.dot)} />
        {statusInfo.label}
      </span>
      <div className="space-y-1 text-[11px] text-muted-foreground">
        <div className="flex justify-between gap-4">
          <span>Start</span>
          <span className="font-medium text-foreground">{format(new Date(task.startDate), 'dd MMM yyyy')}</span>
        </div>
        {task.status !== 'milestone' && <>
          <div className="flex justify-between gap-4">
            <span>End</span>
            <span className="font-medium text-foreground">{format(new Date(task.endDate), 'dd MMM yyyy')}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Duration</span>
            <span className="font-medium text-foreground">{dur}d</span>
          </div>
        </>}
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
          <div className="pt-1 border-t border-border text-foreground/70 italic leading-relaxed">{task.notes}</div>
        )}
      </div>
    </div>
  )
}

// ─── Generic Dropdown wrapper ─────────────────────────────────────────────────
function Dropdown({ trigger, children, align = 'right' }: { trigger: React.ReactNode; children: React.ReactNode; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <div onClick={() => setOpen(o => !o)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.13 }}
            style={{ zIndex: 9998 }}
            className={cn(
              'absolute top-full mt-1.5 bg-popover border border-border rounded-xl shadow-2xl backdrop-blur-sm min-w-[180px]',
              align === 'right' ? 'right-0' : 'left-0'
            )}
            onClick={e => e.stopPropagation()}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Fields Dropdown ──────────────────────────────────────────────────────────
function FieldsDropdown({ fields, onChange }: { fields: Set<FieldKey>; onChange: (f: Set<FieldKey>) => void }) {
  const toggle = (key: FieldKey) => {
    const next = new Set(fields); if (next.has(key)) next.delete(key); else next.add(key); onChange(next)
  }
  return (
    <Dropdown align="right" trigger={
      <button className="flex items-center gap-1.5 text-xs font-medium border border-border rounded-lg px-2 py-1.5 bg-background hover:bg-muted transition-colors whitespace-nowrap">
        <SlidersHorizontal size={12} /> Fields
        <span className="text-[10px] text-muted-foreground">Default</span>
        <ChevronDown size={11} className="text-muted-foreground" />
      </button>
    }>
      <div className="p-2">
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
      </div>
    </Dropdown>
  )
}

// ─── Filters Dropdown ─────────────────────────────────────────────────────────
function FiltersDropdown({ filterStatus, setFilterStatus, filterColor, setFilterColor, onClear }: {
  filterStatus: TaskStatus | 'all'; setFilterStatus: (s: TaskStatus | 'all') => void
  filterColor: TaskColor | 'all'; setFilterColor: (c: TaskColor | 'all') => void
  onClear: () => void
}) {
  const hasFilter = filterStatus !== 'all' || filterColor !== 'all'
  return (
    <Dropdown align="left" trigger={
      <button className={cn('flex items-center gap-1.5 text-xs font-medium border rounded-lg px-2.5 py-1.5 transition-colors whitespace-nowrap',
        hasFilter ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background hover:bg-muted text-foreground')}>
        <Filter size={12} /> Filters
        {hasFilter && <span className="bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold">!</span>}
      </button>
    }>
      <div className="p-3 space-y-3 w-[220px]">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Status</p>
          <div className="flex flex-wrap gap-1">
            <button onClick={() => setFilterStatus('all')}
              className={cn('text-[10px] px-2 py-0.5 rounded-full border transition-colors',
                filterStatus === 'all' ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-muted')}>All</button>
            {(Object.keys(TASK_STATUSES) as TaskStatus[]).map(s => (
              <button key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
                className={cn('text-[10px] px-2 py-0.5 rounded-full border transition-colors',
                  filterStatus === s ? cn(TASK_STATUSES[s].chip, 'border-transparent') : 'border-border hover:bg-muted')}>
                {TASK_STATUSES[s].label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Color</p>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setFilterColor('all')}
              className={cn('text-[10px] px-2 py-0.5 rounded-full border transition-colors',
                filterColor === 'all' ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-muted')}>All</button>
            {(Object.keys(COLORS) as TaskColor[]).map(c => (
              <button key={c} onClick={() => setFilterColor(filterColor === c ? 'all' : c)}
                className={cn('w-5 h-5 rounded-full transition-transform flex-shrink-0', COLORS[c].bar,
                  filterColor === c ? 'ring-2 ring-offset-1 ring-primary scale-110' : 'hover:scale-105')} />
            ))}
          </div>
        </div>
        {hasFilter && (
          <button onClick={onClear}
            className="w-full text-[10px] text-red-500 hover:text-red-600 border border-red-200 dark:border-red-900 rounded-lg py-1 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
            Clear Filters
          </button>
        )}
      </div>
    </Dropdown>
  )
}

// ─── More Menu ────────────────────────────────────────────────────────────────
function MoreMenu() {
  return (
    <Dropdown align="right" trigger={
      <button className="flex items-center gap-1 text-xs font-medium border border-border rounded-lg px-2.5 py-1.5 bg-background hover:bg-muted transition-colors whitespace-nowrap">
        <MoreHorizontal size={14} /> More
      </button>
    }>
      <div className="p-2 w-[160px]">
        {['Export PNG', 'Export PDF', 'Print'].map(label => (
          <button key={label} onClick={() => toast.info(`${label} coming soon`)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors text-xs text-foreground">
            {label}
          </button>
        ))}
      </div>
    </Dropdown>
  )
}

// ─── Share Modal ──────────────────────────────────────────────────────────────
function ShareModal({ workItemId, workItem, onClose }: { workItemId: string; workItem?: WorkItemInfo; onClose: () => void }) {
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const generateLink = async () => {
    setLoading(true)
    try {
      const res = await apiPost<{ token: string }>(`/api/timeline/${workItemId}/share`)
      const token = (res as any).data?.token
      const url = `${window.location.origin}/timeline/share/${token}`
      setShareUrl(url)
    } catch {
      toast.error('Failed to generate share link')
    } finally {
      setLoading(false)
    }
  }

  const copyLink = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
      toast.success('Link copied!')
    })
  }

  useEffect(() => { generateLink() }, [])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Share2 size={15} className="text-primary" />
            <h2 className="text-sm font-semibold">Share Timeline</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            Anyone with this link can view the timeline for <span className="font-medium text-foreground">{workItem?.ticketNumber} — {workItem?.title}</span> without logging in.
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={20} className="animate-spin text-primary" />
            </div>
          ) : shareUrl ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                <Link2 size={13} className="text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-foreground truncate flex-1">{shareUrl}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={copyLink}
                  className={cn('flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium border transition-colors',
                    copied ? 'bg-green-500 text-white border-green-500' : 'btn-primary')}>
                  {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Link</>}
                </button>
                <a href={shareUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-border hover:bg-muted transition-colors">
                  <ExternalLink size={13} />
                </a>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">Link expires in 7 days · Read-only access</p>
            </div>
          ) : (
            <button onClick={generateLink} className="w-full btn-primary text-sm py-2">Generate Link</button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Dependency Arrows SVG overlay ───────────────────────────────────────────
function DependencyArrows({ tasks, days, colWidth, containerRef }: {
  tasks: TimelineTask[]; days: Date[]; colWidth: number; containerRef: React.RefObject<HTMLDivElement | null>
}) {
  const firstDay = days[0]
  // Build a map of taskId -> row index
  const rowMap = useMemo(() => {
    const m: Record<string, number> = {}
    tasks.forEach((t, i) => { m[t.id] = i })
    return m
  }, [tasks])

  const arrows = useMemo(() => {
    return tasks
      .filter(t => t.dependsOn && rowMap[t.dependsOn] !== undefined)
      .map(t => {
        const fromTask = tasks.find(x => x.id === t.dependsOn)!
        const toTask = t
        const fromRow = rowMap[fromTask.id]
        const toRow = rowMap[toTask.id]
        const fromEnd = differenceInCalendarDays(startOfDay(new Date(fromTask.endDate)), firstDay) + 1
        const toStart = differenceInCalendarDays(startOfDay(new Date(toTask.startDate)), firstDay)
        const x1 = fromEnd * colWidth
        const y1 = (fromRow + 0.5) * ROW_HEIGHT + 56  // +56 for header
        const x2 = toStart * colWidth + 4
        const y2 = (toRow + 0.5) * ROW_HEIGHT + 56
        return { id: `${fromTask.id}-${toTask.id}`, x1, y1, x2, y2, color: COLORS[fromTask.color]?.hex ?? '#94a3b8' }
      })
  }, [tasks, rowMap, colWidth, firstDay])

  if (arrows.length === 0) return null

  const totalW = days.length * colWidth
  const totalH = (tasks.length + 1) * ROW_HEIGHT + 56

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none"
      style={{ width: totalW, height: totalH, zIndex: 5 }}
      aria-hidden="true">
      <defs>
        {(Object.keys(COLORS) as TaskColor[]).map(c => (
          <marker key={c} id={`arrow-${c}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={COLORS[c].hex} opacity="0.8" />
          </marker>
        ))}
        <marker id="arrow-default" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" opacity="0.8" />
        </marker>
      </defs>
      {arrows.map(a => {
        // Elbow path: right from end → down/up → right to start
        const midX = (a.x1 + a.x2) / 2
        const d = `M ${a.x1} ${a.y1} C ${midX} ${a.y1}, ${midX} ${a.y2}, ${a.x2} ${a.y2}`
        const colorKey = Object.keys(COLORS).find(k => COLORS[k as TaskColor].hex === a.color) ?? 'default'
        return (
          <path key={a.id} d={d}
            fill="none" stroke={a.color} strokeWidth="1.5" strokeDasharray="4 2"
            opacity="0.65" strokeLinecap="round"
            markerEnd={`url(#arrow-${colorKey})`} />
        )
      })}
    </svg>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function TimelinePage({ workItemId, readOnly = false }: { workItemId: string; readOnly?: boolean }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canEdit = !readOnly && user?.role !== UserRole.BUSINESS_USER

  const [windowStart, setWindowStart] = useState<Date | null>(null)
  const [zoom, setZoom] = useState(100)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [filterColor, setFilterColor] = useState<TaskColor | 'all'>('all')
  const [visibleFields, setVisibleFields] = useState<Set<FieldKey>>(
    new Set(Object.entries(FIELD_DEFS).filter(([, v]) => v.default).map(([k]) => k as FieldKey))
  )
  const [collapsed, setCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editTask, setEditTask] = useState<TimelineTask | null>(null)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const colWidth = Math.round(BASE_COL_WIDTH * zoom / 100)

  // Sync windowStart with request date when workItem loads or createdAt changes
  const workItemCreatedAt = data?.data?.workItem?.createdAt
  useEffect(() => {
    if (!workItemCreatedAt) return
    const requestDate = startOfDay(new Date(workItemCreatedAt))
    setWindowStart(addDays(requestDate, -2))
  }, [workItemCreatedAt])

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
    const todayOffset = differenceInCalendarDays(new Date(), effectiveStart)
    if (gridRef.current && todayOffset >= 0)
      gridRef.current.scrollLeft = Math.max(0, todayOffset * colWidth - 160)
  }, [windowStart, colWidth])

  const shiftDays = (n: number) => setWindowStart(d => addDays(d ?? startOfDay(new Date()), n))
  const goToToday = () => {
    const reqDate = workItem?.createdAt ? startOfDay(new Date(workItem.createdAt)) : addDays(startOfDay(new Date()), -14)
    setWindowStart(addDays(reqDate, -2))
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
    const oi = tasks.findIndex(t => t.id === active.id)
    const ni = tasks.findIndex(t => t.id === over.id)
    const reordered = arrayMove(tasks, oi, ni)
    queryClient.setQueryData(['timeline', workItemId], (old: any) => ({
      ...old, data: { ...old.data, tasks: reordered.map((t, i) => ({ ...t, sortOrder: i })) },
    }))
    reorderMut.mutate(reordered.map((t, i) => ({ id: t.id, sortOrder: i })))
  }, [tasks, workItemId, queryClient, reorderMut])

  const effectiveStart = windowStart ?? addDays(startOfDay(new Date()), -14)
  const days = useMemo(() => Array.from({ length: DAYS_TOTAL }, (_, i) => addDays(effectiveStart, i)), [effectiveStart])

  if (isLoading) return <TimelineSkeleton />

  return (
    <div className="flex flex-col bg-background overflow-hidden" style={{ height: readOnly ? '100svh' : '100svh' }}>

      {/* ── Top bar ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 md:px-4 py-2.5 border-b border-border bg-card gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {!readOnly && (
            <Link href="/kanban" className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0">
              <ArrowLeft size={15} />
            </Link>
          )}
          {/* Mobile sidebar toggle */}
          {!readOnly && (
            <button className="md:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground flex-shrink-0"
              onClick={() => setMobileSidebarOpen(true)}>
              <SlidersHorizontal size={15} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-mono text-muted-foreground truncate">{workItem?.ticketNumber}</span>
              {workItem && (
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0', STATUS_COLORS[workItem.status as WorkflowStatus])}>
                  {STATUS_LABELS[workItem.status as WorkflowStatus]}
                </span>
              )}
              {readOnly && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium flex-shrink-0">Read Only</span>}
            </div>
            <h1 className="text-sm font-semibold text-foreground truncate">{workItem?.title ?? 'Timeline'}</h1>
            <p className="text-[10px] text-muted-foreground hidden sm:block">Project Timeline</p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!readOnly && (
            <>
              <button onClick={() => setShareModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 text-xs font-medium border border-border rounded-lg px-2.5 py-1.5 bg-background hover:bg-muted transition-colors">
                <Share2 size={13} /> Share
              </button>
              <FiltersDropdown filterStatus={filterStatus} setFilterStatus={setFilterStatus}
                filterColor={filterColor} setFilterColor={setFilterColor}
                onClear={() => { setFilterStatus('all'); setFilterColor('all') }} />
              <MoreMenu />
              <div className="w-px h-5 bg-border mx-0.5 hidden sm:block" />
            </>
          )}
          <button onClick={() => shiftDays(-7)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><ChevronLeft size={15} /></button>
          <button onClick={goToToday} className="px-2 md:px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1">
            <Calendar size={11} /> <span className="hidden sm:inline">Today</span>
          </button>
          <button onClick={() => shiftDays(7)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><ChevronRight size={15} /></button>
          {canEdit && (
            <>
              <div className="w-px h-5 bg-border mx-0.5" />
              <button onClick={() => setAddModalOpen(true)} className="btn-primary flex items-center gap-1 text-xs px-2 md:px-3 py-1.5">
                <Plus size={13} /> <span className="hidden sm:inline">Add Row</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 md:px-4 py-1.5 border-b border-border bg-card/50 overflow-x-auto scrollbar-none">
        <div className="relative flex-shrink-0">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search task or milestone"
            className="pl-7 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 w-40 md:w-52" />
        </div>
        <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
          <span className="text-xs text-muted-foreground hidden md:inline">View</span>
          <span className="text-xs font-medium border border-border rounded-lg px-2 py-1.5 bg-background hidden md:inline">Timeline</span>
          <div className="w-px h-4 bg-border hidden md:block" />
          <span className="text-xs text-muted-foreground hidden md:inline">Scale</span>
          <span className="text-xs font-medium border border-border rounded-lg px-2 py-1.5 bg-background hidden md:inline">Weeks</span>
          <div className="w-px h-4 bg-border hidden md:block" />
          <FieldsDropdown fields={visibleFields} onChange={setVisibleFields} />
          <div className="w-px h-4 bg-border" />
          <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"><ZoomOut size={13} /></button>
          <span className="text-xs font-medium w-9 text-center">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"><ZoomIn size={13} /></button>
          <button onClick={() => setZoom(100)} className="text-xs px-2 py-1.5 border border-border rounded-lg hover:bg-muted transition-colors hidden sm:inline">Fit</button>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileSidebarOpen(false)} />
              <motion.div initial={{ x: -SIDEBAR_WIDTH }} animate={{ x: 0 }} exit={{ x: -SIDEBAR_WIDTH }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed top-0 left-0 h-full z-50 md:hidden bg-card border-r border-border shadow-2xl"
                style={{ width: SIDEBAR_WIDTH }}>
                <SidebarContent tasks={tasks} canEdit={canEdit} visibleFields={visibleFields}
                  onEdit={t => { setEditTask(t); setMobileSidebarOpen(false) }}
                  onDelete={id => deleteMut.mutate(id)}
                  onStatusChange={(t, s) => apiPatch(`/api/timeline/${workItemId}/${t.id}`, { status: s }).then(() => queryClient.invalidateQueries({ queryKey: ['timeline', workItemId] }))}
                  onDragEnd={handleDragEnd} sensors={sensors}
                  onAdd={() => { setAddModalOpen(true); setMobileSidebarOpen(false) }}
                  onClose={() => setMobileSidebarOpen(false)} />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Desktop sidebar */}
        <div className={cn('flex-shrink-0 border-r border-border bg-card flex-col hidden md:flex transition-all duration-200', collapsed ? 'w-10' : '')}
          style={{ width: collapsed ? 40 : SIDEBAR_WIDTH }}>
          {collapsed ? (
            <div className="flex flex-col items-center pt-3">
              <button onClick={() => setCollapsed(false)} className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"><ChevronRight size={14} /></button>
            </div>
          ) : (
            <SidebarContent tasks={tasks} canEdit={canEdit} visibleFields={visibleFields}
              onEdit={t => setEditTask(t)}
              onDelete={id => deleteMut.mutate(id)}
              onStatusChange={(t, s) => apiPatch(`/api/timeline/${workItemId}/${t.id}`, { status: s }).then(() => queryClient.invalidateQueries({ queryKey: ['timeline', workItemId] }))}
              onDragEnd={handleDragEnd} sensors={sensors}
              onAdd={() => setAddModalOpen(true)}
              onCollapse={() => setCollapsed(true)} />
          )}
        </div>

        {/* Gantt */}
        <div ref={gridRef} className="flex-1 overflow-x-auto overflow-y-auto relative">
          <div style={{ width: days.length * colWidth, minWidth: '100%', position: 'relative' }}>
            <DateHeader days={days} colWidth={colWidth} />
            {/* Dependency arrows overlay */}
            <DependencyArrows tasks={tasks} days={days} colWidth={colWidth} containerRef={gridRef} />
            {tasks.map(task => (
              <GanttRow key={task.id} task={task} days={days} colWidth={colWidth}
                canEdit={canEdit} workItemId={workItemId}
                onUpdated={() => queryClient.invalidateQueries({ queryKey: ['timeline', workItemId] })} />
            ))}
            {tasks.length === 0 && (
              <div style={{ height: ROW_HEIGHT * 5 }} className="flex items-center justify-center text-muted-foreground/30 text-sm">
                {canEdit ? 'Click "Add Row" to get started' : 'No timeline tasks yet'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex-shrink-0 border-t border-border bg-card px-3 md:px-4 py-2 flex items-center gap-3 md:gap-5 flex-wrap overflow-x-auto scrollbar-none">
        {(Object.entries(TASK_STATUSES) as [TaskStatus, typeof TASK_STATUSES[TaskStatus]][]).map(([key, val]) => (
          <button key={key} onClick={() => !readOnly && setFilterStatus(filterStatus === key ? 'all' : key)}
            className={cn('flex items-center gap-1.5 transition-opacity flex-shrink-0', readOnly ? '' : 'cursor-pointer hover:opacity-80',
              filterStatus !== 'all' && filterStatus !== key ? 'opacity-40' : '')}>
            {key === 'milestone'
              ? <div className="w-2.5 h-2.5 rotate-45 bg-violet-500 flex-shrink-0" style={{ borderRadius: 1 }} />
              : <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', val.dot)} />
            }
            <span className="text-xs text-muted-foreground whitespace-nowrap">{val.label}</span>
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          {tasks.length !== allTasks.length && ` / ${allTasks.length}`}
        </span>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {shareModalOpen && <ShareModal workItemId={workItemId} workItem={workItem} onClose={() => setShareModalOpen(false)} />}
        {(addModalOpen || editTask) && (
          <TaskFormModal workItemId={workItemId} task={editTask}
            onClose={() => { setAddModalOpen(false); setEditTask(null) }}
            onSaved={() => { queryClient.invalidateQueries({ queryKey: ['timeline', workItemId] }); setAddModalOpen(false); setEditTask(null) }} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Sidebar Content (shared between desktop & mobile) ───────────────────────
function SidebarContent({ tasks, canEdit, visibleFields, onEdit, onDelete, onStatusChange, onDragEnd, sensors, onAdd, onCollapse, onClose }: {
  tasks: TimelineTask[]; canEdit: boolean; visibleFields: Set<FieldKey>
  onEdit: (t: TimelineTask) => void; onDelete: (id: string) => void
  onStatusChange: (t: TimelineTask, s: TaskStatus) => void
  onDragEnd: (e: DragEndEvent) => void; sensors: any
  onAdd: () => void; onCollapse?: () => void; onClose?: () => void
}) {
  return (
    <>
      <div className="flex-shrink-0 border-b border-border px-3 py-2 flex items-center justify-between" style={{ height: 56 }}>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Task / Milestone</span>
        <div className="flex items-center gap-1">
          {onClose && <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors md:hidden"><X size={13} /></button>}
          {onCollapse && <button onClick={onCollapse} className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors hidden md:block"><ChevronLeft size={13} /></button>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <Calendar size={28} className="text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No tasks yet</p>
                {canEdit && <p className="text-xs text-muted-foreground/60 mt-1">Click &quot;Add Row&quot; to start</p>}
              </div>
            ) : tasks.map(task => (
              <SidebarRow key={task.id} task={task} canEdit={canEdit} visibleFields={visibleFields}
                onEdit={() => onEdit(task)}
                onDelete={() => onDelete(task.id)}
                onStatusChange={s => onStatusChange(task, s)} />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      {canEdit && (
        <div className="flex-shrink-0 border-t border-border p-3">
          <button onClick={onAdd}
            className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-muted">
            <Plus size={13} /> Add Task / Milestone
          </button>
        </div>
      )}
    </>
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
    <div className="sticky top-0 z-20 bg-card border-b border-border" style={{ height: 56 }}>
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
          const today = isToday(d); const isWeekend = d.getDay() === 0 || d.getDay() === 6
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
      className={cn('flex items-center gap-1.5 px-2 border-b border-border/50 group hover:bg-muted/30 transition-colors',
        isDragging ? 'opacity-50 bg-muted/50 z-50' : '')}>
      {canEdit && (
        <button {...attributes} {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground opacity-0 group-hover:opacity-100 touch-none">
          <GripVertical size={13} />
        </button>
      )}
      {isMilestone
        ? <div className={cn('w-3 h-3 rotate-45 flex-shrink-0', color.bar)} style={{ borderRadius: 2 }} />
        : <div className={cn('w-3 h-3 rounded-full flex-shrink-0', color.bar)} />
      }
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{task.label}</p>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {visibleFields.has('status') && (
            <span className={cn('inline-flex items-center gap-1 text-[9px] font-medium px-1 py-0.5 rounded-full flex-shrink-0', statusInfo.chip)}>
              <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', statusInfo.dot)} />
              {statusInfo.label}
            </span>
          )}
          {visibleFields.has('date') && !isMilestone && (
            <span className="text-[9px] text-muted-foreground truncate">{format(new Date(task.startDate), 'dd MMM')} – {format(new Date(task.endDate), 'dd MMM')} · {dur}d</span>
          )}
          {visibleFields.has('date') && isMilestone && (
            <span className="text-[9px] text-muted-foreground">{format(new Date(task.startDate), 'dd MMM yyyy')}</span>
          )}
        </div>
      </div>
      {visibleFields.has('assignee') && task.assignee && (
        <Avatar name={task.assignee.name} avatarUrl={task.assignee.avatarUrl} size={20} />
      )}
      {canEdit && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={onEdit} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Edit2 size={11} /></button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600"><Trash2 size={11} /></button>
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
  const barW = Math.min(dur - Math.max(-startOffset, 0), days.length - Math.max(startOffset, 0)) * colWidth - 4
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
      document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp)
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
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp)
  }, [canEdit, isMilestone, task.id, taskStart, taskEnd, workItemId, queryClient, updateMut, colWidth])

  const inView = startOffset + dur > 0 && startOffset < days.length

  return (
    <div className="relative border-b border-border/50 hover:bg-muted/10 transition-colors"
      style={{ height: ROW_HEIGHT, minWidth: days.length * colWidth }}>
      {days.map((d, i) => (d.getDay() === 0 || d.getDay() === 6)
        ? <div key={i} className="absolute inset-y-0 bg-muted/20" style={{ left: i * colWidth, width: colWidth }} /> : null
      )}
      {days.map((d, i) => isToday(d)
        ? <div key={`t${i}`} className="absolute inset-y-0 w-px bg-primary/60 z-10" style={{ left: i * colWidth + colWidth / 2 }} /> : null
      )}
      {days.map((_, i) => <div key={`g${i}`} className="absolute inset-y-0 w-px bg-border/15" style={{ left: (i + 1) * colWidth - 1 }} />)}

      {inView && (
        isMilestone ? (
          <div className="absolute z-20 flex flex-col items-center"
            style={{ left: Math.max(startOffset, 0) * colWidth + colWidth / 2 - 10, top: ROW_HEIGHT / 2 - 10 }}>
            <Tooltip content={<BarTooltipContent task={task} />}>
              <div className={cn('w-5 h-5 rotate-45 cursor-pointer hover:scale-110 transition-transform shadow-md', color.bar)} style={{ borderRadius: 2 }} />
            </Tooltip>
            <div className="w-px h-2 bg-muted-foreground/30 mt-0.5" />
          </div>
        ) : (
          <Tooltip content={<BarTooltipContent task={task} />}>
            <div
              className={cn('absolute top-3 rounded-md flex items-center select-none shadow-sm border z-10', color.bar, color.border, color.text,
                canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default')}
              style={{ left: Math.max(startOffset, 0) * colWidth + 2, width: Math.max(barW, colWidth - 4), height: ROW_HEIGHT - 24 }}
              onMouseDown={e => handleMouseDown(e, 'move')}>
              {canEdit && (
                <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-l-md hover:bg-black/20 flex items-center justify-center"
                  onMouseDown={e => handleMouseDown(e, 'resize-left')}>
                  <div className="w-0.5 h-3 bg-white/50 rounded-full" />
                </div>
              )}
              <span className="flex-1 px-2 md:px-3 text-xs font-medium truncate pointer-events-none select-none">
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
    if (!isMilestone && startDate && endDate && startDate > endDate) e.endDate = 'Must be after start'
    setErrors(e); return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); if (!validate()) return
    saveMut.mutate({ label: label.trim(), startDate, endDate: isMilestone ? startDate : endDate, color, status, priority, notes: notes || null })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[90svh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          {/* Mobile drag handle */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-border rounded-full sm:hidden" />
          <h2 className="text-sm font-semibold mt-2 sm:mt-0">{isEdit ? 'Edit Task' : 'Add Task / Milestone'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Label *</label>
            <input value={label} onChange={e => setLabel(e.target.value)} className="input" placeholder="e.g. Requirements Review" autoFocus />
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
                  className={cn('w-7 h-7 rounded-full transition-transform flex items-center justify-center', COLORS[c].bar, color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105')}>
                  {color === c && <Check size={12} className="text-white" />}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} className="input">
              <option value="low">Low</option><option value="medium">Medium</option>
              <option value="high">High</option><option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="label">Notes <span className="text-muted-foreground">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input resize-none" rows={2} placeholder="Additional notes..." />
          </div>
          <div className="flex gap-3 pt-1 pb-safe">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={saveMut.isPending} className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm py-2.5">
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
        <div className="w-72 border-r border-border bg-card p-4 space-y-3 hidden md:block">
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

// ─── Public Read-Only Timeline Page ──────────────────────────────────────────
export function PublicTimelinePage({ token }: { token: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['timeline-public', token],
    queryFn: () => apiGet<{ workItem: WorkItemInfo; tasks: TimelineTask[] }>(`/api/timeline/public/${token}`),
    retry: false,
  })

  if (isLoading) return <TimelineSkeleton />
  if (isError) return (
    <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
      <div className="text-4xl">🔒</div>
      <h1 className="text-lg font-semibold text-foreground">Link not found or expired</h1>
      <p className="text-sm text-muted-foreground">This share link may have expired or been revoked.</p>
      <Link href="/" className="text-sm text-primary hover:underline">Go to CRMS</Link>
    </div>
  )

  const workItemId = data?.data?.workItem?.id ?? ''
  return <TimelinePage workItemId={workItemId} readOnly />
}
