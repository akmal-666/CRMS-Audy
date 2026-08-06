'use client'

import {
  useState, useRef, useCallback, useEffect, useMemo,
} from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Loader2, ChevronLeft, ChevronRight, Calendar, X, Check,
  ZoomIn, ZoomOut, Share2, Filter, Link2, Copy, ExternalLink,
  ChevronDown, ChevronRight as ChevronRightIcon, Folder, Settings2,
  Trash2, Edit2, GripVertical, MoreHorizontal, Clock, User,
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/context/auth-context'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { cn, STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, getInitials, timeAgo } from '@/lib/utils'
import { WorkflowStatus, UserRole, Priority } from '@crms/types'
import { toast } from 'sonner'
import {
  addDays, addMonths, format, differenceInCalendarDays,
  isToday, startOfDay, getWeek, startOfMonth, getDaysInMonth,
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
const ROW_HEIGHT = 44
const SIDEBAR_W = 260
const DETAIL_W = 320
const DAYS_TOTAL = 120

const COLORS = {
  blue:   { bar: 'bg-blue-500',    hex: '#3b82f6' },
  green:  { bar: 'bg-emerald-500', hex: '#10b981' },
  yellow: { bar: 'bg-amber-400',   hex: '#fbbf24' },
  orange: { bar: 'bg-orange-500',  hex: '#f97316' },
  red:    { bar: 'bg-red-500',     hex: '#ef4444' },
  purple: { bar: 'bg-violet-500',  hex: '#8b5cf6' },
  gray:   { bar: 'bg-slate-400',   hex: '#94a3b8' },
} as const
type TaskColor = keyof typeof COLORS

const TASK_STATUSES = {
  not_started: { label: 'Not Started', dot: 'bg-slate-400',  chip: 'bg-slate-100 text-slate-600',  color: 'gray'   as TaskColor },
  in_progress: { label: 'In Progress', dot: 'bg-blue-500',   chip: 'bg-blue-100 text-blue-700',    color: 'blue'   as TaskColor },
  completed:   { label: 'Completed',   dot: 'bg-green-500',  chip: 'bg-green-100 text-green-700',  color: 'green'  as TaskColor },
  on_hold:     { label: 'On Hold',     dot: 'bg-amber-500',  chip: 'bg-amber-100 text-amber-700',  color: 'yellow' as TaskColor },
  delayed:     { label: 'Delayed',     dot: 'bg-red-500',    chip: 'bg-red-100 text-red-700',      color: 'red'    as TaskColor },
  milestone:   { label: 'Milestone',   dot: 'bg-violet-500', chip: 'bg-violet-100 text-violet-700',color: 'purple' as TaskColor },
} as const
type TaskStatus = keyof typeof TASK_STATUSES

const STATUS_COLOR_MAP: Record<TaskStatus, TaskColor> = {
  not_started: 'gray',
  in_progress: 'blue',
  completed:   'green',
  on_hold:     'yellow',
  delayed:     'red',
  milestone:   'purple',
}

// ─── Types ────────────────────────────────────────────────────────────────────
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
  dependsOn?: string | null
  assignee?: { id: string; name: string; avatarUrl?: string | null } | null
}

interface WorkItem {
  id: string
  ticketNumber: string
  title: string
  status: string
  priority: string
  description?: string
  problemDescription?: string
  dueDate?: string
  createdAt: string
  department?: { name: string }
  manager?: { id: string; name: string; avatarUrl?: string | null }
  developer?: { id: string; name: string; avatarUrl?: string | null }
  vendor?: { id: string; name: string }
  tasks?: TimelineTask[]
}

interface AllTimelineData {
  workItems: Array<WorkItem & { tasks: TimelineTask[] }>
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

// ─── Portal Tooltip ───────────────────────────────────────────────────────────
function Tooltip({ children, content, disabled }: { children: React.ReactNode; content: React.ReactNode; disabled?: boolean }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0, above: true })
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mounted, setMounted] = useState(false)
  const TOOLTIP_W = 240
  const TOOLTIP_H = 160

  useEffect(() => { setMounted(true) }, [])

  const computePos = useCallback((clientX: number, clientY: number) => {
    const vw = window.innerWidth
    const x = Math.min(Math.max(clientX, TOOLTIP_W / 2 + 8), vw - TOOLTIP_W / 2 - 8)
    const above = clientY > TOOLTIP_H + 24
    setPos({ x, y: above ? clientY - 14 : clientY + 14, above })
  }, [])

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null }
    computePos(e.clientX, e.clientY)
    setShow(true)
  }, [computePos])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!show) return
    computePos(e.clientX, e.clientY)
  }, [show, computePos])

  const hide_ = useCallback(() => { hideTimer.current = setTimeout(() => setShow(false), 80) }, [])
  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current) }, [])

  if (disabled) return <>{children}</>

  return (
    <>
      <div onMouseEnter={handleMouseEnter} onMouseMove={handleMouseMove} onMouseLeave={hide_}
        onTouchStart={(e) => { e.stopPropagation(); computePos(e.touches[0].clientX, e.touches[0].clientY); setShow(v => !v) }}
        className="contents">
        {children}
      </div>
      {mounted && show && createPortal(
        <motion.div key="tt" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.1 }}
          style={{ position: 'fixed', left: pos.x, top: pos.y, transform: pos.above ? 'translate(-50%,-100%)' : 'translate(-50%,0)', zIndex: 9999, width: TOOLTIP_W }}
          className="pointer-events-none bg-white dark:bg-zinc-900 border border-border rounded-xl shadow-2xl p-3 text-xs ring-1 ring-black/5 dark:ring-white/10">
          {content}
          <div className={`absolute w-3 h-3 bg-popover border-border ${pos.above ? '-bottom-1.5 border-r border-b' : '-top-1.5 border-l border-t'}`}
            style={{ left: '50%', transform: 'translateX(-50%) rotate(45deg)' }} />
        </motion.div>,
        document.body
      )}
    </>
  )
}

// ─── Month/Year Picker Dropdown ───────────────────────────────────────────────
function MonthPicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(value.getFullYear())
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [mounted, setMounted] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        const target = e.target as Element
        if (!target.closest('[data-month-picker]')) setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 6, left: rect.left })
      setPickerYear(value.getFullYear())
    }
    setOpen(o => !o)
  }

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const curMonth = value.getMonth()
  const curYear = value.getFullYear()

  return (
    <>
      <button ref={btnRef} onClick={handleOpen}
        className="flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary transition-colors px-1.5 py-1 rounded-lg hover:bg-muted flex-shrink-0">
        {format(value, 'MMMM yyyy')}
        <ChevronDown size={13} className={cn('text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {mounted && open && createPortal(
        <motion.div
          data-month-picker
          initial={{ opacity: 0, y: -4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.97 }}
          transition={{ duration: 0.12 }}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, width: 228 }}
          className="bg-white dark:bg-zinc-900 border border-border rounded-xl shadow-2xl p-3 ring-1 ring-black/5 dark:ring-white/10">
          {/* Year nav */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setPickerYear(y => y - 1)}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm font-semibold text-foreground select-none">{pickerYear}</span>
            <button onClick={() => setPickerYear(y => y + 1)}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
          {/* Month grid */}
          <div className="grid grid-cols-4 gap-1">
            {MONTHS.map((m, i) => {
              const isActive = i === curMonth && pickerYear === curYear
              return (
                <button key={m}
                  onClick={() => { onChange(startOfMonth(new Date(pickerYear, i, 1))); setOpen(false) }}
                  className={cn('text-xs px-1 py-2 rounded-lg transition-colors font-medium',
                    isActive ? 'bg-primary text-white' : 'hover:bg-muted text-muted-foreground hover:text-foreground')}>
                  {m}
                </button>
              )
            })}
          </div>
        </motion.div>,
        document.body
      )}
    </>
  )
}
// ─── InlineSelect — portal dropdown untuk edit field langsung di panel ────────
function InlineSelect<T extends string>({ label, value, options, onChange, disabled }: {
  label: string
  value: T
  options: { value: T; label: string; className?: string }[]
  onChange: (v: T) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, flipUp: false })
  const [mounted, setMounted] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        const t = e.target as Element
        if (!t.closest('[data-inline-select]')) setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    if (disabled) return
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const vh = window.innerHeight
      const dropH = options.length * 36 + 16
      const flipUp = rect.bottom + dropH > vh && rect.top > dropH
      setPos({
        top: flipUp ? rect.top - dropH - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        flipUp,
      })
    }
    setOpen(o => !o)
  }

  const current = options.find(o => o.value === value)

  return (
    <>
      <button ref={btnRef} onClick={handleOpen} disabled={disabled}
        className={cn(
          'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors text-left',
          current?.className ?? '',
          disabled ? 'cursor-default opacity-70' : 'cursor-pointer hover:brightness-95 active:scale-[0.99]'
        )}>
        <span className="flex-1 truncate">{current?.label ?? value}</span>
        {!disabled && <ChevronDown size={11} className="flex-shrink-0 text-current opacity-60" />}
      </button>
      {mounted && open && createPortal(
        <motion.div
          data-inline-select
          initial={{ opacity: 0, y: -4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.1 }}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: Math.max(pos.width, 200), zIndex: 9999 }}
          className="bg-white dark:bg-zinc-900 border border-border rounded-xl shadow-2xl py-1.5 overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
          {options.map(opt => (
            <button key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors text-left',
                opt.value === value
                  ? 'bg-primary/10 text-primary'
                  : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              )}>
              <span className={cn('w-2 h-2 rounded-full flex-shrink-0 border border-black/10',
                opt.className?.match(/bg-[\w-]+/)?.[0] ?? 'bg-zinc-400'
              )} />
              <span className="flex-1 truncate">{opt.label}</span>
              {opt.value === value && <Check size={11} className="text-primary flex-shrink-0" />}
            </button>
          ))}
        </motion.div>,
        document.body
      )}
    </>
  )
}

function DateHeader({ days, colWidth }: { days: Date[]; colWidth: number }) {
  // Calculate months
  const months: { label: string; count: number }[] = []
  let curMonth = -1; let mCount = 0
  days.forEach(d => {
    const monthKey = d.getFullYear() * 100 + d.getMonth()
    if (monthKey !== curMonth) {
      if (curMonth !== -1) months.push({ label: format(new Date(Math.floor(curMonth / 100), curMonth % 100, 1), 'MMMM yyyy'), count: mCount })
      curMonth = monthKey
      mCount = 1
    } else mCount++
  })
  if (curMonth !== -1) months.push({ label: format(new Date(Math.floor(curMonth / 100), curMonth % 100, 1), 'MMMM yyyy'), count: mCount })

  // Calculate weeks
  const weeks: { label: string; count: number }[] = []
  let curWeek = -1; let wCount = 0
  days.forEach(d => {
    const w = getWeek(d)
    if (w !== curWeek) { if (curWeek !== -1) weeks.push({ label: `WEEK ${curWeek}`, count: wCount }); curWeek = w; wCount = 1 } else wCount++
  })
  if (curWeek !== -1) weeks.push({ label: `WEEK ${curWeek}`, count: wCount })

  return (
    <div className="sticky top-0 z-20 bg-card border-b border-border" style={{ height: 80 }}>
      {/* Month row */}
      <div className="flex border-b border-border/50" style={{ height: 28 }}>
        {months.map((m, i) => (
          <div key={i} className="flex-shrink-0 flex items-center justify-center text-xs font-bold text-foreground border-r border-border/40 uppercase tracking-wide bg-muted/20"
            style={{ width: m.count * colWidth }}>
            {m.count * colWidth >= 80 ? m.label : m.count * colWidth >= 40 ? format(new Date(m.label), 'MMM yyyy') : ''}
          </div>
        ))}
      </div>
      {/* Week row */}
      <div className="flex border-b border-border/40" style={{ height: 20 }}>
        {weeks.map((w, i) => (
          <div key={i} className="flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-muted-foreground/70 border-r border-border/30 uppercase tracking-wider bg-muted/10"
            style={{ width: w.count * colWidth }}>
            {w.count * colWidth >= 60 ? w.label : ''}
          </div>
        ))}
      </div>
      {/* Day row */}
      <div className="flex" style={{ height: 32 }}>
        {days.map((d, i) => {
          const today = isToday(d)
          const isWeekend = d.getDay() === 0 || d.getDay() === 6
          const isMonday = d.getDay() === 1
          return (
            <div key={i} style={{ width: colWidth }}
              className={cn('flex-shrink-0 flex flex-col items-center justify-center border-r border-border/20 text-[9px]',
                today ? 'bg-primary/15 text-primary font-bold' : '',
                isWeekend ? 'bg-muted/20 text-muted-foreground/40' : 'text-muted-foreground',
                isMonday && !today ? 'border-r-border/50' : '')}>
              {colWidth >= 24 && <span className="leading-none">{format(d, 'EEE')[0]}</span>}
              <span className={cn('font-medium leading-none', today && 'text-primary')}>{format(d, 'd')}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Task Bar (single Gantt row) ──────────────────────────────────────────────
function TaskBar({ task, days, colWidth, canEdit, workItemId, onUpdated, onSelect, isSelected }: {
  task: TimelineTask; days: Date[]; colWidth: number
  canEdit: boolean; workItemId: string; onUpdated: () => void
  onSelect: () => void; isSelected: boolean
}) {
  const queryClient = useQueryClient()
  const color = COLORS[task.color] ?? COLORS.blue
  const isMilestone = task.status === 'milestone'
  const taskStart = startOfDay(new Date(task.startDate))
  const taskEnd = startOfDay(new Date(task.endDate))
  const firstDay = days[0]
  const startOffset = differenceInCalendarDays(taskStart, firstDay)
  const dur = isMilestone ? 1 : differenceInCalendarDays(taskEnd, taskStart) + 1
  const visibleDur = Math.min(dur - Math.max(-startOffset, 0), days.length - Math.max(startOffset, 0))
  const barW = visibleDur * colWidth - 4
  const dragRef = useRef<{ type: 'move' | 'resize-r'; startX: number; origStart: Date; origEnd: Date } | null>(null)

  const updateMut = useMutation({
    mutationFn: (d: { startDate?: string; endDate?: string }) => apiPatch(`/api/timeline/${workItemId}/${task.id}`, d),
    onSuccess: () => onUpdated(),
    onError: () => toast.error('Failed to update'),
  })

  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'move' | 'resize-r') => {
    if (!canEdit || isMilestone) return
    e.preventDefault(); e.stopPropagation()
    dragRef.current = { type, startX: e.clientX, origStart: taskStart, origEnd: taskEnd }
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const delta = Math.round((ev.clientX - dragRef.current.startX) / colWidth)
      if (delta === 0) return
      let ns = dragRef.current.origStart, ne = dragRef.current.origEnd
      if (type === 'move') { ns = addDays(ns, delta); ne = addDays(ne, delta) }
      else { ne = addDays(ne, delta); if (ne <= ns) ne = addDays(ns, 1) }
      queryClient.setQueryData(['timeline-all'], (old: any) => {
        if (!old?.workItems) return old
        return { ...old, workItems: old.workItems.map((wi: any) => wi.id !== workItemId ? wi : {
          ...wi, tasks: wi.tasks.map((t: TimelineTask) => t.id === task.id ? { ...t, startDate: ns.toISOString(), endDate: ne.toISOString() } : t)
        })}
      })
    }
    const onUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp)
      if (!dragRef.current) return
      const delta = Math.round((ev.clientX - dragRef.current.startX) / colWidth)
      if (delta !== 0) {
        let ns = dragRef.current.origStart, ne = dragRef.current.origEnd
        if (type === 'move') { ns = addDays(ns, delta); ne = addDays(ne, delta) }
        else { ne = addDays(ne, delta); if (ne <= ns) ne = addDays(ns, 1) }
        updateMut.mutate({ startDate: format(ns, 'yyyy-MM-dd'), endDate: format(ne, 'yyyy-MM-dd') })
      }
      dragRef.current = null
    }
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp)
  }, [canEdit, isMilestone, task.id, taskStart, taskEnd, workItemId, queryClient, updateMut, colWidth])

  const inView = startOffset + dur > 0 && startOffset < days.length
  if (!inView) return (
    <div className={cn('border-b border-border/30 hover:bg-muted/10 transition-colors', isSelected ? 'bg-primary/5' : '')}
      style={{ height: ROW_HEIGHT, minWidth: days.length * colWidth }} />
  )

  const tooltipContent = (
    <div className="space-y-1.5">
      <p className="font-semibold text-foreground">{task.label}</p>
      <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full', TASK_STATUSES[task.status]?.chip)}>
        {TASK_STATUSES[task.status]?.label}
      </span>
      <div className="text-[11px] text-muted-foreground space-y-0.5">
        <div className="flex justify-between gap-4"><span>Start</span><span className="text-foreground font-medium">{format(taskStart, 'dd MMM yyyy')}</span></div>
        {!isMilestone && <div className="flex justify-between gap-4"><span>End</span><span className="text-foreground font-medium">{format(taskEnd, 'dd MMM yyyy')}</span></div>}
        {!isMilestone && <div className="flex justify-between gap-4"><span>Duration</span><span className="text-foreground font-medium">{dur}d</span></div>}
      </div>
    </div>
  )

  return (
    <div onClick={onSelect}
      className={cn('relative border-b border-border/30 hover:bg-muted/10 transition-colors cursor-pointer', isSelected ? 'bg-primary/5' : '')}
      style={{ height: ROW_HEIGHT, minWidth: days.length * colWidth }}>
      {/* weekend bg */}
      {days.map((d, i) => (d.getDay() === 0 || d.getDay() === 6)
        ? <div key={i} className="absolute inset-y-0 bg-muted/15" style={{ left: i * colWidth, width: colWidth }} /> : null)}
      {/* today line */}
      {days.map((d, i) => isToday(d)
        ? <div key={`t${i}`} className="absolute inset-y-0 w-px bg-primary/50 z-10" style={{ left: i * colWidth + colWidth / 2 }} /> : null)}

      {isMilestone ? (
        <div className="absolute z-20 flex items-center gap-1"
          style={{ left: Math.max(startOffset, 0) * colWidth + colWidth / 2 - 8, top: ROW_HEIGHT / 2 - 8 }}>
          <Tooltip content={tooltipContent}>
            <div className={cn('w-4 h-4 rotate-45 cursor-pointer hover:scale-110 transition-transform shadow-md', color.bar)}
              style={{ borderRadius: 2 }} />
          </Tooltip>
          {colWidth >= 24 && (
            <span className="text-[10px] font-medium text-foreground/70 whitespace-nowrap ml-1 select-none pointer-events-none">
              {task.label} · {format(taskStart, 'dd MMM')}
            </span>
          )}
        </div>
      ) : (
        <Tooltip content={tooltipContent}>
          <div
            className={cn('absolute top-2 rounded flex items-center select-none shadow-sm z-10 group/bar',
              color.bar, canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer')}
            style={{ left: Math.max(startOffset, 0) * colWidth + 2, width: Math.max(barW, colWidth - 4), height: ROW_HEIGHT - 16 }}
            onMouseDown={e => handleMouseDown(e, 'move')}>
            <span className="flex-1 px-2 text-[11px] font-medium text-white truncate pointer-events-none select-none">
              {task.label} · {format(taskStart, 'dd MMM')}–{format(taskEnd, 'dd MMM')}
            </span>
            {task.assignee && (
              <div className="mr-1.5 flex-shrink-0 pointer-events-none opacity-80">
                <Avatar name={task.assignee.name} avatarUrl={task.assignee.avatarUrl} size={14} />
              </div>
            )}
            {canEdit && (
              <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-r hover:bg-black/20 flex items-center justify-center"
                onMouseDown={e => handleMouseDown(e, 'resize-r')}>
                <div className="w-0.5 h-3 bg-white/50 rounded-full" />
              </div>
            )}
          </div>
        </Tooltip>
      )}
    </div>
  )
}

// ─── Dependency Arrows SVG overlay (per work-item group) ─────────────────────
function DependencyArrows({ tasks, days, colWidth, rowOffset }: {
  tasks: TimelineTask[]; days: Date[]; colWidth: number; rowOffset: number
}) {
  const firstDay = days[0]
  const rowMap = useMemo(() => {
    const m: Record<string, number> = {}
    tasks.forEach((t, i) => { m[t.id] = i })
    return m
  }, [tasks])

  const arrows = useMemo(() => tasks
    .filter(t => t.dependsOn && rowMap[t.dependsOn] !== undefined)
    .map(t => {
      const from = tasks.find(x => x.id === t.dependsOn)!
      const fromEnd = differenceInCalendarDays(startOfDay(new Date(from.endDate)), firstDay) + 1
      const toStart = differenceInCalendarDays(startOfDay(new Date(t.startDate)), firstDay)
      const x1 = fromEnd * colWidth
      const y1 = (rowMap[from.id] + 0.5) * ROW_HEIGHT + ROW_HEIGHT // +header row
      const x2 = toStart * colWidth + 4
      const y2 = (rowMap[t.id] + 0.5) * ROW_HEIGHT + ROW_HEIGHT
      return { id: `${from.id}-${t.id}`, x1, y1, x2, y2, color: COLORS[from.color]?.hex ?? '#94a3b8' }
    }), [tasks, rowMap, colWidth, firstDay])

  if (arrows.length === 0) return null
  const totalW = days.length * colWidth
  const totalH = (tasks.length + 2) * ROW_HEIGHT

  return (
    <svg className="absolute top-0 left-0 pointer-events-none" style={{ width: totalW, height: totalH, zIndex: 5 }} aria-hidden>
      <defs>
        {Object.keys(COLORS).map(c => (
          <marker key={c} id={`arr-mod-${c}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={COLORS[c as TaskColor].hex} opacity="0.8" />
          </marker>
        ))}
      </defs>
      {arrows.map(a => {
        const midX = (a.x1 + a.x2) / 2
        const d = `M ${a.x1} ${a.y1} C ${midX} ${a.y1}, ${midX} ${a.y2}, ${a.x2} ${a.y2}`
        const colorKey = (Object.keys(COLORS) as TaskColor[]).find(k => COLORS[k].hex === a.color) ?? 'gray'
        return (
          <path key={a.id} d={d} fill="none" stroke={a.color} strokeWidth="1.5"
            strokeDasharray="4 2" opacity="0.6" strokeLinecap="round"
            markerEnd={`url(#arr-mod-${colorKey})`} />
        )
      })}
    </svg>
  )
}

// ─── Project Group Header Row (summary bar spanning all tasks) ────────────────
function ProjectHeaderBar({ workItem, days, colWidth, isSelected, onSelect }: {
  workItem: WorkItem & { tasks: TimelineTask[] }
  days: Date[]; colWidth: number; isSelected: boolean; onSelect: () => void
}) {
  const firstDay = days[0]
  const tasks = workItem.tasks
  if (tasks.length === 0) return (
    <div onClick={onSelect} className={cn('relative border-b border-border/30 cursor-pointer hover:bg-muted/10', isSelected ? 'bg-primary/5' : '')}
      style={{ height: ROW_HEIGHT, minWidth: days.length * colWidth }}>
      {days.map((d, i) => isToday(d) ? <div key={i} className="absolute inset-y-0 w-px bg-primary/50 z-10" style={{ left: i * colWidth + colWidth / 2 }} /> : null)}
    </div>
  )
  const minStart = tasks.reduce((m, t) => { const d = startOfDay(new Date(t.startDate)); return d < m ? d : m }, startOfDay(new Date(tasks[0].startDate)))
  const maxEnd = tasks.reduce((m, t) => { const d = startOfDay(new Date(t.endDate)); return d > m ? d : m }, startOfDay(new Date(tasks[0].endDate)))
  const startOffset = differenceInCalendarDays(minStart, firstDay)
  const dur = differenceInCalendarDays(maxEnd, minStart) + 1
  const barW = Math.min(dur, days.length - Math.max(startOffset, 0)) * colWidth - 4

  return (
    <div onClick={onSelect} className={cn('relative border-b border-border/30 cursor-pointer hover:bg-muted/10', isSelected ? 'bg-primary/5' : '')}
      style={{ height: ROW_HEIGHT, minWidth: days.length * colWidth }}>
      {days.map((d, i) => isToday(d) ? <div key={i} className="absolute inset-y-0 w-px bg-primary/50 z-10" style={{ left: i * colWidth + colWidth / 2 }} /> : null)}
      {barW > 0 && (
        <div className="absolute top-2 rounded flex items-center bg-slate-400/60 border border-slate-400/40 select-none"
          style={{ left: Math.max(startOffset, 0) * colWidth + 2, width: Math.max(barW, colWidth - 4), height: ROW_HEIGHT - 16 }}>
          <span className="px-2 text-[11px] font-semibold text-white/90 truncate pointer-events-none select-none">
            {workItem.ticketNumber} · {format(minStart, 'dd MMM')}–{format(maxEnd, 'dd MMM')}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Left Sidebar Row (task label) ───────────────────────────────────────────
function SidebarTaskRow({ task, canEdit, onEdit, onDelete, isSelected, onSelect }: {
  task: TimelineTask; canEdit: boolean
  onEdit: () => void; onDelete: () => void
  isSelected: boolean; onSelect: () => void
}) {
  const color = COLORS[task.color] ?? COLORS.blue
  const statusInfo = TASK_STATUSES[task.status] ?? TASK_STATUSES.not_started
  const isMilestone = task.status === 'milestone'
  return (
    <div onClick={onSelect}
      className={cn('flex items-center gap-2 px-3 border-b border-border/30 group hover:bg-muted/30 transition-colors cursor-pointer',
        isSelected ? 'bg-primary/5' : '')}
      style={{ height: ROW_HEIGHT, paddingLeft: 24 }}>
      {isMilestone
        ? <div className={cn('w-2.5 h-2.5 rotate-45 flex-shrink-0', color.bar)} style={{ borderRadius: 1 }} />
        : <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', color.bar)} />
      }
      <span className="flex-1 text-xs text-foreground truncate">{task.label}</span>
      {canEdit && (
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0">
          <button onClick={e => { e.stopPropagation(); onEdit() }} className="p-1 rounded hover:bg-muted text-muted-foreground"><Edit2 size={11} /></button>
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600"><Trash2 size={11} /></button>
        </div>
      )}
      <button className="opacity-0 group-hover:opacity-60 p-1 flex-shrink-0 text-muted-foreground"><MoreHorizontal size={11} /></button>
    </div>
  )
}

// ─── Left Sidebar Project Group Header ────────────────────────────────────────
function SidebarProjectRow({ workItem, expanded, onToggle, taskCount, canEdit, onAddTask, isSelected, onSelect, onShare }: {
  workItem: WorkItem; expanded: boolean; onToggle: () => void
  taskCount: number; canEdit: boolean; onAddTask: () => void
  isSelected: boolean; onSelect: () => void; onShare: () => void
}) {
  return (
    <div className={cn('flex items-center gap-1.5 px-3 border-b border-border/50 group hover:bg-muted/20 transition-colors',
      isSelected ? 'bg-primary/5' : 'bg-muted/5')}
      style={{ height: ROW_HEIGHT }}>
      <button onClick={e => { e.stopPropagation(); onToggle() }} className="p-0.5 rounded hover:bg-muted flex-shrink-0 text-muted-foreground">
        {expanded ? <ChevronDown size={12} /> : <ChevronRightIcon size={12} />}
      </button>
      <Folder size={12} className="text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onSelect}>
        <p className="text-xs font-semibold text-foreground truncate">{workItem.title}</p>
        <p className="text-[10px] text-muted-foreground">{workItem.ticketNumber} · {taskCount} items</p>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0">
        {canEdit && (
          <button onClick={e => { e.stopPropagation(); onAddTask() }}
            className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary" title="Add task">
            <Plus size={11} />
          </button>
        )}
        <button onClick={e => { e.stopPropagation(); onShare() }}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Share timeline">
          <Share2 size={11} />
        </button>
      </div>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({ workItem, selectedTask, onClose, canEdit, onEditTask }: {
  workItem: WorkItem & { tasks: TimelineTask[] }
  selectedTask: TimelineTask | null
  onClose: () => void
  canEdit: boolean
  onEditTask: (t: TimelineTask) => void
}) {
  const [activeTab, setActiveTab] = useState<'details' | 'subitems' | 'activity'>('details')
  const tasks = workItem.tasks
  const completedCount = tasks.filter(t => t.status === 'completed').length

  // Calculate progress based on elapsed days vs total duration
  const progress = (() => {
    if (tasks.length === 0) return 0

    const today = new Date()
    let totalDays = 0
    let elapsedDays = 0

    tasks.forEach(task => {
      if (task.status === 'milestone') return
      const start = new Date(task.startDate)
      const end = new Date(task.endDate)
      const taskDuration = differenceInCalendarDays(end, start) + 1
      totalDays += taskDuration

      if (today <= start) {
        elapsedDays += 0
      } else if (today >= end) {
        elapsedDays += taskDuration
      } else {
        elapsedDays += differenceInCalendarDays(today, start) + 1
      }
    })

    return totalDays > 0 ? Math.min(Math.round((elapsedDays / totalDays) * 100), 100) : 0
  })()

  const minStart = tasks.length > 0
    ? tasks.reduce((m, t) => { const d = new Date(t.startDate); return d < m ? d : m }, new Date(tasks[0].startDate))
    : null
  const maxEnd = tasks.length > 0
    ? tasks.reduce((m, t) => { const d = new Date(t.endDate); return d > m ? d : m }, new Date(tasks[0].endDate))
    : null
  const duration = minStart && maxEnd ? differenceInCalendarDays(maxEnd, minStart) + 1 : null

  // Fetch full detail for activity log
  const { data: activityData } = useQuery({
    queryKey: ['work-item-activity', workItem.id],
    queryFn: () => apiGet<any>(`/api/work-items/${workItem.id}`),
    enabled: activeTab === 'activity',
    staleTime: 30_000,
  })
  const activityLogs: any[] = activityData?.data?.activityLogs ?? []

  const TABS = [
    { key: 'details', label: 'Details' },
    { key: 'subitems', label: `Sub Items (${tasks.length})` },
    { key: 'activity', label: 'Activity' },
  ] as const

  return (
    <motion.div initial={{ x: DETAIL_W }} animate={{ x: 0 }} exit={{ x: DETAIL_W }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="flex-shrink-0 border-l border-border bg-card flex flex-col overflow-hidden"
      style={{ width: DETAIL_W }}>
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">{workItem.ticketNumber}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {workItem.department && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">{workItem.department.name}</span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground flex-shrink-0 ml-2"><X size={14} /></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-4 flex-shrink-0 overflow-x-auto scrollbar-none">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn('text-xs font-medium py-2.5 mr-4 border-b-2 transition-colors whitespace-nowrap flex-shrink-0',
              activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Details tab ── */}
        {activeTab === 'details' && (
          <div className="p-4 space-y-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Summary</p>
              <p className="font-semibold text-foreground">{selectedTask ? selectedTask.label : workItem.title}</p>
            </div>
            {!selectedTask && workItem.problemDescription && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-foreground/80 leading-relaxed line-clamp-4">{workItem.problemDescription}</p>
              </div>
            )}
            {workItem.manager && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Assignee</p>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border">
                  <Avatar name={workItem.manager.name} avatarUrl={workItem.manager.avatarUrl} size={22} />
                  <span className="text-xs font-medium text-foreground">{workItem.manager.name}</span>
                  <X size={12} className="ml-auto text-muted-foreground" />
                </div>
              </div>
            )}
            {minStart && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <Calendar size={13} className="text-muted-foreground" />
                  {format(minStart, 'dd MMM yyyy')}
                </div>
              </div>
            )}
            {maxEnd && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Due Date</p>
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <Calendar size={13} className="text-muted-foreground" />
                  {format(maxEnd, 'dd MMM yyyy')}
                </div>
              </div>
            )}
            {duration !== null && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Duration</p>
                <p className="text-xs text-foreground font-medium">{duration} days</p>
              </div>
            )}
            {tasks.length > 0 && (
              <div>
                <div className="flex justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Progress</p>
                  <p className="text-xs font-semibold text-foreground">{progress}%</p>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            <div className="pt-2 border-t border-border space-y-2">
              <Link href={`/timeline/${workItem.id}`}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors">
                <ExternalLink size={12} /> Open Full Timeline
              </Link>
              {canEdit && (
                <button className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                  <Trash2 size={12} /> Delete Item
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Sub Items tab ── */}
        {activeTab === 'subitems' && (
          <div className="divide-y divide-border/50">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Calendar size={24} className="text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No sub items yet</p>
                {canEdit && <p className="text-xs text-muted-foreground/60 mt-1">Add tasks from the Gantt chart</p>}
              </div>
            ) : tasks.map(task => {
              const statusInfo = TASK_STATUSES[task.status] ?? TASK_STATUSES.not_started
              const color = COLORS[task.color] ?? COLORS.blue
              const isMilestone = task.status === 'milestone'
              const dur = isMilestone ? null : differenceInCalendarDays(new Date(task.endDate), new Date(task.startDate)) + 1
              return (
                <div key={task.id} className="px-4 py-3 hover:bg-muted/30 transition-colors group">
                  <div className="flex items-start gap-2">
                    {isMilestone
                      ? <div className={cn('w-2.5 h-2.5 rotate-45 flex-shrink-0 mt-0.5', color.bar)} style={{ borderRadius: 1 }} />
                      : <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5', color.bar)} />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{task.label}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full', statusInfo.chip)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', statusInfo.dot)} />
                          {statusInfo.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(task.startDate), 'dd MMM')}
                          {!isMilestone && ` – ${format(new Date(task.endDate), 'dd MMM')}`}
                          {dur && ` · ${dur}d`}
                        </span>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0">
                        <button onClick={() => onEditTask(task)} className="p-1 rounded hover:bg-muted text-muted-foreground"><Edit2 size={11} /></button>
                      </div>
                    )}
                  </div>
                  {task.assignee && (
                    <div className="flex items-center gap-1.5 mt-1.5 pl-4">
                      <Avatar name={task.assignee.name} avatarUrl={task.assignee.avatarUrl} size={14} />
                      <span className="text-[10px] text-muted-foreground">{task.assignee.name}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Activity tab ── */}
        {activeTab === 'activity' && (
          <div className="p-4">
            {activityLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock size={24} className="text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No activity yet</p>
              </div>
            ) : (
              <div className="space-y-0">
                {activityLogs.slice().reverse().map((log: any, i: number) => (
                  <div key={log.id ?? i} className="relative pl-6 pb-4">
                    {/* timeline line */}
                    {i < activityLogs.length - 1 && (
                      <div className="absolute left-[7px] top-4 bottom-0 w-px bg-border" />
                    )}
                    {/* dot */}
                    <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full border-2 border-border bg-card flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                    </div>
                    <div>
                      <p className="text-xs text-foreground leading-snug">{log.description ?? log.action}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {log.user?.name && (
                          <span className="text-[10px] text-muted-foreground font-medium">{log.user.name}</span>
                        )}
                        <span className="text-[10px] text-muted-foreground/60">
                          {log.createdAt ? timeAgo(log.createdAt) : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </motion.div>
  )
}

// ─── Share Modal ──────────────────────────────────────────────────────────────
function ShareModal({ workItemId, ticketNumber, onClose }: { workItemId: string; ticketNumber: string; onClose: () => void }) {
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    apiPost<{ token: string }>(`/api/timeline/${workItemId}/share`)
      .then(res => {
        const token = (res as any).data?.token
        setShareUrl(`${window.location.origin}/timeline/share/${token}`)
      })
      .catch(() => toast.error('Failed to generate share link'))
      .finally(() => setLoading(false))
  }, [workItemId])

  const copy = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
      toast.success('Link copied!')
    })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2"><Share2 size={14} className="text-primary" />
            <h2 className="text-sm font-semibold">Share Timeline — {ticketNumber}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={14} /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-muted-foreground">Anyone with this link can view the timeline for <strong>{ticketNumber}</strong> without logging in. Link will be invalid when CR is completed or dropped.</p>
          {loading ? <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-primary" /></div>
          : shareUrl ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                <Link2 size={12} className="text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-foreground truncate flex-1">{shareUrl}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={copy} className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border transition-colors',
                  copied ? 'bg-green-500 text-white border-green-500' : 'btn-primary')}>
                  {copied ? <><Check size={12} />Copied!</> : <><Copy size={12} />Copy Link</>}
                </button>
                <a href={shareUrl} target="_blank" rel="noreferrer"
                  className="flex items-center justify-center px-3 py-2 rounded-xl text-xs border border-border hover:bg-muted transition-colors">
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Task Form Modal ──────────────────────────────────────────────────────────
function TaskFormModal({ workItemId, task, allTasks, onClose, onSaved }: {
  workItemId: string; task: TimelineTask | null
  allTasks: TimelineTask[]; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!task
  const [label, setLabel] = useState(task?.label ?? '')
  const [startDate, setStartDate] = useState(task ? format(new Date(task.startDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(task ? format(new Date(task.endDate), 'yyyy-MM-dd') : format(addDays(new Date(), 6), 'yyyy-MM-dd'))
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'not_started')
  const [color, setColor] = useState<TaskColor>(task?.color ?? 'blue')
  const [priority, setPriority] = useState(task?.priority ?? 'medium')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [dependsOn, setDependsOn] = useState(task?.dependsOn ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const isMilestone = status === 'milestone'

  // When status changes, auto-suggest color but don't override if user manually picked
  const [colorManuallySet, setColorManuallySet] = useState(!!task?.color)
  const handleStatusChange = (s: TaskStatus) => {
    setStatus(s)
    if (!colorManuallySet) setColor(STATUS_COLOR_MAP[s])
  }
  const handleColorChange = (c: TaskColor) => { setColor(c); setColorManuallySet(true) }

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
    if (!isMilestone && startDate && endDate && startDate > endDate) e.endDate = 'Must be after start'
    setErrors(e); return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); if (!validate()) return
    saveMut.mutate({ label: label.trim(), startDate, endDate: isMilestone ? startDate : endDate, color, status, priority, notes: notes || null, dependsOn: dependsOn || null })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[90svh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
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
                <button key={s} type="button" onClick={() => handleStatusChange(s)}
                  className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                    status === s ? cn(TASK_STATUSES[s].chip, 'border-transparent ring-2 ring-offset-1 ring-primary/40') : 'border-border hover:bg-muted')}>
                  {s === 'milestone' ? <div className={cn('w-2 h-2 rotate-45', TASK_STATUSES[s].dot)} style={{ borderRadius: 1 }} /> : <div className={cn('w-2 h-2 rounded-full', TASK_STATUSES[s].dot)} />}
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
              {(Object.keys(COLORS) as TaskColor[]).filter(c => c !== 'gray').map(c => (
                <button key={c} type="button" onClick={() => handleColorChange(c)}
                  className={cn('w-7 h-7 rounded-full transition-transform flex items-center justify-center flex-shrink-0',
                    COLORS[c].bar, color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105')}>
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
          {allTasks.filter(t => t.id !== task?.id).length > 0 && (
            <div>
              <label className="label">Depends On</label>
              <select value={dependsOn} onChange={e => setDependsOn(e.target.value)} className="input">
                <option value="">None</option>
                {allTasks.filter(t => t.id !== task?.id).map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Notes <span className="text-muted-foreground">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input resize-none" rows={2} placeholder="Additional notes..." />
          </div>
          <div className="flex gap-3 pt-1">
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

// ─── Main TimelineModule ──────────────────────────────────────────────────────
export function TimelineModule() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canEdit = user?.role !== UserRole.BUSINESS_USER

  const [zoom, setZoom] = useState(100)
  const [windowStart, setWindowStart] = useState<Date>(() => addDays(startOfDay(new Date()), -7))
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [addTaskForWorkItem, setAddTaskForWorkItem] = useState<string | null>(null)
  const [editTask, setEditTask] = useState<TimelineTask | null>(null)
  const [shareWorkItemId, setShareWorkItemId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const syncingRef = useRef(false)
  const colWidth = Math.round(BASE_COL_WIDTH * zoom / 100)
  const days = useMemo(() => Array.from({ length: DAYS_TOTAL }, (_, i) => addDays(windowStart, i)), [windowStart])

  // Fetch all work items with their timeline tasks
  const { data, isLoading } = useQuery({
    queryKey: ['timeline-all'],
    queryFn: async () => {
      const res = await apiGet<any>('/api/timeline/all')
      // Group tasks by workItemId, then fetch work items
      const allTasks: TimelineTask[] = (res as any).data ?? []
      const workItemIds = [...new Set(allTasks.map(t => t.workItemId))]
      // Also fetch all work items (for items with no tasks)
      const wiRes = await apiGet<any>('/api/work-items?pageSize=500')
      const workItems: WorkItem[] = (wiRes as any).data?.items ?? (wiRes as any).data ?? []
      const grouped = workItems.map(wi => ({
        ...wi,
        tasks: allTasks.filter(t => t.workItemId === wi.id).sort((a, b) => a.sortOrder - b.sortOrder),
      })).filter(wi => wi.tasks.length > 0 || expandedGroups.has(wi.id))
      return { workItems: grouped }
    },
    staleTime: 30_000,
  })

  const workItems = data?.workItems ?? []

  // Auto-expand all on first load
  useEffect(() => {
    if (workItems.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set(workItems.map(wi => wi.id)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workItems.length])

  // Scroll to today on mount
  useEffect(() => {
    const todayOffset = differenceInCalendarDays(new Date(), windowStart)
    if (gridRef.current && todayOffset >= 0)
      gridRef.current.scrollLeft = Math.max(0, todayOffset * colWidth - 200)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colWidth])

  const selectedWorkItem = workItems.find(wi => wi.id === selectedWorkItemId) ?? null
  const selectedTask = selectedWorkItem?.tasks.find(t => t.id === selectedTaskId) ?? null

  const filteredWorkItems = useMemo(() => {
    const wis = workItems
    if (filterStatus === 'all') return wis
    return wis.filter(wi => wi.tasks.some(t => t.status === filterStatus))
  }, [workItems, filterStatus])

  // Sync vertical scroll between sidebar and gantt
  useEffect(() => {
    const grid = gridRef.current
    const sidebar = sidebarRef.current
    if (!grid || !sidebar) return
    const onGridScroll = () => {
      if (syncingRef.current) return
      syncingRef.current = true
      sidebar.scrollTop = grid.scrollTop
      syncingRef.current = false
    }
    const onSidebarScroll = () => {
      if (syncingRef.current) return
      syncingRef.current = true
      grid.scrollTop = sidebar.scrollTop
      syncingRef.current = false
    }
    grid.addEventListener('scroll', onGridScroll)
    sidebar.addEventListener('scroll', onSidebarScroll)
    return () => { grid.removeEventListener('scroll', onGridScroll); sidebar.removeEventListener('scroll', onSidebarScroll) }
  }, [])

  // Esc to close detail panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelectedWorkItemId(null); setSelectedTaskId(null) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const deleteMut = useMutation({
    mutationFn: ({ wiId, taskId }: { wiId: string; taskId: string }) => apiDelete(`/api/timeline/${wiId}/${taskId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['timeline-all'] }); toast.success('Task deleted') },
    onError: () => toast.error('Failed to delete'),
  })

  const shiftDays = (n: number) => setWindowStart(d => addDays(d, n))
  const goToToday = () => setWindowStart(addDays(startOfDay(new Date()), -7))

  const toggleGroup = (id: string) => setExpandedGroups(prev => {
    const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next
  })

  const handleTaskSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['timeline-all'] })
    setAddTaskForWorkItem(null); setEditTask(null)
  }

  if (isLoading) return <ModuleSkeleton />

  return (
    <div className="flex flex-col bg-background h-full overflow-hidden -m-4 lg:-m-6">
      {/* ── Top Bar ── */}
      <div className="flex-shrink-0 border-b border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-foreground">Timeline</h1>
          <p className="text-xs text-muted-foreground">View all project schedule and milestones in calendar</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button className="hidden sm:flex items-center gap-1.5 text-xs border border-border rounded-lg px-2.5 py-1.5 hover:bg-muted transition-colors text-muted-foreground">
            <Settings2 size={12} /> Calendar
          </button>
          <button onClick={() => setAddTaskForWorkItem(filteredWorkItems[0]?.id ?? null)}
            disabled={!canEdit || filteredWorkItems.length === 0}
            className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5">
            <Plus size={13} /> Add Item
          </button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex-shrink-0 border-b border-border bg-card/80 px-4 py-1.5 flex items-center gap-3 overflow-x-auto scrollbar-none">
        {/* Date nav */}
        <button onClick={goToToday} className="text-xs font-medium px-2.5 py-1.5 border border-border rounded-lg hover:bg-muted transition-colors flex-shrink-0">Today</button>
        <button onClick={() => shiftDays(-7)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors flex-shrink-0"><ChevronLeft size={14} /></button>
        <button onClick={() => shiftDays(7)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors flex-shrink-0"><ChevronRight size={14} /></button>
        <MonthPicker
          value={windowStart}
          onChange={(d) => setWindowStart(addDays(d, -3))}
        />
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground hidden md:inline">View:</span>
          <span className="text-xs font-medium border border-border rounded-lg px-2 py-1.5 bg-background hidden md:inline">Timeline</span>
          <div className="w-px h-4 bg-border hidden md:block" />
          <span className="text-xs text-muted-foreground hidden md:inline">Scale:</span>
          <span className="text-xs font-medium border border-border rounded-lg px-2 py-1.5 bg-background hidden md:inline">Month</span>
          <div className="w-px h-4 bg-border" />
          <button onClick={() => setShowFilters(v => !v)}
            className={cn('flex items-center gap-1.5 text-xs border rounded-lg px-2.5 py-1.5 transition-colors',
              showFilters || filterStatus !== 'all' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted text-muted-foreground')}>
            <Filter size={12} /> Filters
            {filterStatus !== 'all' && <span className="bg-primary text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[9px] font-bold">1</span>}
          </button>
          <div className="w-px h-4 bg-border" />
          <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"><ZoomOut size={13} /></button>
          <span className="text-xs font-medium w-9 text-center">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"><ZoomIn size={13} /></button>
          <button onClick={() => setZoom(100)} className="text-xs px-2 py-1 border border-border rounded-lg hover:bg-muted transition-colors">Fit</button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex-shrink-0 border-b border-border bg-card/50 px-4 py-2 flex items-center gap-2 overflow-hidden">
            <span className="text-xs text-muted-foreground">Task Status:</span>
            <div className="flex gap-1 flex-wrap">
              {['all', ...Object.keys(TASK_STATUSES)].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={cn('text-[10px] px-2 py-0.5 rounded-full border transition-colors',
                    filterStatus === s
                      ? s === 'all' ? 'bg-foreground text-background border-foreground' : cn(TASK_STATUSES[s as TaskStatus]?.chip, 'border-transparent')
                      : 'border-border hover:bg-muted')}>
                  {s === 'all' ? 'All' : TASK_STATUSES[s as TaskStatus]?.label}
                </button>
              ))}
            </div>
            {filterStatus !== 'all' && (
              <button onClick={() => setFilterStatus('all')} className="text-[10px] text-red-500 hover:text-red-600 ml-auto">Clear</button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="flex-shrink-0 border-r border-border bg-card flex flex-col overflow-hidden" style={{ width: SIDEBAR_W }}>
          {/* Sidebar header */}
          <div className="flex-shrink-0 border-b border-border px-3 py-2 bg-muted/10" style={{ height: 56 }}>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pt-2">Project / Milestone</p>
          </div>
          {/* Sidebar rows */}
          <div ref={sidebarRef} className="flex-1 overflow-y-auto overflow-x-hidden">
            {filteredWorkItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <Calendar size={28} className="text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No timeline tasks yet</p>
              </div>
            ) : filteredWorkItems.map(wi => {
              const expanded = expandedGroups.has(wi.id)
              const isWiSelected = selectedWorkItemId === wi.id && !selectedTaskId
              return (
                <div key={wi.id}>
                  <SidebarProjectRow
                    workItem={wi}
                    expanded={expanded}
                    onToggle={() => toggleGroup(wi.id)}
                    taskCount={wi.tasks.length}
                    canEdit={canEdit}
                    onAddTask={() => setAddTaskForWorkItem(wi.id)}
                    isSelected={isWiSelected}
                    onSelect={() => { setSelectedWorkItemId(wi.id); setSelectedTaskId(null) }}
                    onShare={() => setShareWorkItemId(wi.id)}
                  />
                  <AnimatePresence>
                    {expanded && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                        style={{ overflow: 'hidden' }}>
                        {wi.tasks.map(task => (
                          <SidebarTaskRow
                            key={task.id}
                            task={task}
                            canEdit={canEdit}
                            onEdit={() => setEditTask(task)}
                            onDelete={() => deleteMut.mutate({ wiId: wi.id, taskId: task.id })}
                            isSelected={selectedTaskId === task.id}
                            onSelect={() => { setSelectedWorkItemId(wi.id); setSelectedTaskId(task.id) }}
                          />
                        ))}
                        {canEdit && (
                          <button onClick={() => setAddTaskForWorkItem(wi.id)}
                            className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground px-6 py-1.5 hover:bg-muted/30 transition-colors border-b border-border/20"
                            style={{ height: 32 }}>
                            <Plus size={11} /> Add Task
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
            {/* Projects are auto-created when a new CR is added */}
          </div>
        </div>

        {/* Gantt grid */}
        <div ref={gridRef} className="flex-1 overflow-x-auto overflow-y-auto relative">
          <div style={{ width: days.length * colWidth, minWidth: '100%', position: 'relative' }}>
            <DateHeader days={days} colWidth={colWidth} />
            {filteredWorkItems.map(wi => {
              const expanded = expandedGroups.has(wi.id)
              const isWiSelected = selectedWorkItemId === wi.id && !selectedTaskId
              return (
                <div key={wi.id}>
                  {/* Project summary bar row */}
                  <ProjectHeaderBar
                    workItem={wi}
                    days={days}
                    colWidth={colWidth}
                    isSelected={isWiSelected}
                    onSelect={() => { setSelectedWorkItemId(wi.id); setSelectedTaskId(null) }}
                  />
                  <AnimatePresence>
                    {expanded && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                        style={{ overflow: 'hidden', position: 'relative' }}>
                        {/* Dependency arrows SVG overlay */}
                        {wi.tasks.some(t => t.dependsOn) && (
                          <DependencyArrows tasks={wi.tasks} days={days} colWidth={colWidth} rowOffset={0} />
                        )}
                        {wi.tasks.map(task => (
                          <TaskBar
                            key={task.id}
                            task={task}
                            days={days}
                            colWidth={colWidth}
                            canEdit={canEdit}
                            workItemId={wi.id}
                            onUpdated={() => queryClient.invalidateQueries({ queryKey: ['timeline-all'] })}
                            isSelected={selectedTaskId === task.id}
                            onSelect={() => { setSelectedWorkItemId(wi.id); setSelectedTaskId(task.id) }}
                          />
                        ))}
                        {/* Empty add-task row spacer */}
                        {canEdit && (
                          <div className="border-b border-border/20" style={{ height: 32, minWidth: days.length * colWidth }}>
                            {days.map((d, i) => isToday(d) ? <div key={i} className="absolute inset-y-0 w-px bg-primary/30" style={{ left: i * colWidth + colWidth / 2 }} /> : null)}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right detail panel */}
        <AnimatePresence>
          {selectedWorkItem && (
            <DetailPanel
              workItem={selectedWorkItem}
              selectedTask={selectedTask}
              onClose={() => { setSelectedWorkItemId(null); setSelectedTaskId(null) }}
              canEdit={canEdit}
              onEditTask={t => setEditTask(t)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── Legend ── */}
      <div className="flex-shrink-0 border-t border-border bg-card px-4 py-2 flex items-center gap-4 flex-wrap overflow-x-auto scrollbar-none">
        {(Object.entries(TASK_STATUSES) as [TaskStatus, typeof TASK_STATUSES[TaskStatus]][]).map(([key, val]) => (
          <button key={key} onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
            className={cn('flex items-center gap-1.5 flex-shrink-0 hover:opacity-80 transition-opacity',
              filterStatus !== 'all' && filterStatus !== key ? 'opacity-40' : '')}>
            {key === 'milestone'
              ? <div className="w-2.5 h-2.5 rotate-45 bg-violet-500 flex-shrink-0" style={{ borderRadius: 1 }} />
              : <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', val.dot)} />
            }
            <span className="text-xs text-muted-foreground whitespace-nowrap">{val.label}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-1 rounded hover:bg-muted text-muted-foreground"><ZoomOut size={13} /></button>
          <span className="text-xs font-medium">— {zoom}% +</span>
          <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-1 rounded hover:bg-muted text-muted-foreground"><ZoomIn size={13} /></button>
        </div>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {shareWorkItemId && (
          <ShareModal
            workItemId={shareWorkItemId}
            ticketNumber={workItems.find(wi => wi.id === shareWorkItemId)?.ticketNumber ?? ''}
            onClose={() => setShareWorkItemId(null)}
          />
        )}
        {(addTaskForWorkItem || editTask) && (
          <TaskFormModal
            workItemId={(editTask?.workItemId ?? addTaskForWorkItem)!}
            task={editTask}
            allTasks={workItems.find(wi => wi.id === (editTask?.workItemId ?? addTaskForWorkItem))?.tasks ?? []}
            onClose={() => { setAddTaskForWorkItem(null); setEditTask(null) }}
            onSaved={handleTaskSaved}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function ModuleSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-background animate-pulse">
      <div className="h-14 border-b border-border bg-card" />
      <div className="h-10 border-b border-border bg-card/50" />
      <div className="flex flex-1 overflow-hidden">
        <div className="border-r border-border bg-card p-3 space-y-2" style={{ width: SIDEBAR_W }}>
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className={cn('h-10 bg-muted rounded-lg', i % 3 === 0 ? 'ml-0' : 'ml-4')} />)}
        </div>
        <div className="flex-1 p-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded-lg" style={{ width: `${30 + (i % 4) * 15}%`, marginLeft: `${(i % 5) * 8}%` }} />
          ))}
        </div>
      </div>
      <div className="h-9 border-t border-border bg-card" />
    </div>
  )
}
