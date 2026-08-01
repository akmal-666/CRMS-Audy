'use client'

import { useState, useMemo } from 'react'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, addMonths, subMonths } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { STATUS_LABELS, cn, exportToCSV } from '@/lib/utils'
import { WorkflowStatus } from '@crms/types'
import { TicketDetailDrawer } from '../tickets/ticket-detail-drawer'
import { ChevronLeft, ChevronRight, Check, Download, Calendar as CalendarIcon, Layers } from 'lucide-react'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

interface WorkItem {
  id: string
  ticketNumber: string
  title: string
  status: WorkflowStatus
  createdAt: string
  dueDate?: string
  priority: string
  requesterName: string
  department?: { name: string }
  vendor?: { name: string }
}

interface TimelineTaskEvent {
  id: string
  workItemId: string
  label: string
  startDate: string
  endDate: string
  color: string
  status: string
  workItem?: {
    id: string
    ticketNumber: string
    title: string
    status: string
    priority: string
    department?: { name: string }
  }
}

const STATUS_COLORS_HEX: Record<WorkflowStatus, string> = {
  [WorkflowStatus.IN_PIPELINE]: '#94a3b8',
  [WorkflowStatus.ASSESSMENT]:  '#3b82f6',
  [WorkflowStatus.DEVELOPMENT]: '#8b5cf6',
  [WorkflowStatus.UAT]:         '#f59e0b',
  [WorkflowStatus.DEPLOYMENT]:  '#f97316',
  [WorkflowStatus.GO_LIVE]:     '#22c55e',
  [WorkflowStatus.DROP]:        '#ef4444',
}

const TIMELINE_COLOR_HEX: Record<string, string> = {
  blue:   '#3b82f6',
  green:  '#10b981',
  yellow: '#f59e0b',
  orange: '#f97316',
  red:    '#ef4444',
  purple: '#8b5cf6',
}

const TASK_STATUS_COLORS: Record<string, string> = {
  not_started: '#94a3b8',
  in_progress: '#3b82f6',
  completed:   '#22c55e',
  on_hold:     '#f59e0b',
  delayed:     '#ef4444',
  milestone:   '#8b5cf6',
}

export function CalendarView() {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [activeStatuses, setActiveStatuses] = useState<Set<WorkflowStatus>>(new Set(Object.values(WorkflowStatus)))
  const [showTimelineTasks, setShowTimelineTasks] = useState(true)
  const [view, setView] = useState<View>('month')
  const [date, setDate] = useState(new Date())

  // Fetch work items
  const { data: wiData, isLoading: wiLoading } = useQuery({
    queryKey: ['work-items', 'calendar'],
    queryFn: () => apiGet<WorkItem[]>('/api/work-items', { pageSize: 500 }),
    select: (res) => (res as any).data ?? [],
  })

  // Fetch all timeline tasks
  const { data: tlData, isLoading: tlLoading } = useQuery({
    queryKey: ['timeline-tasks', 'all'],
    queryFn: () => apiGet<TimelineTaskEvent[]>('/api/timeline/all'),
    select: (res) => (res as any).data ?? [],
    enabled: showTimelineTasks,
  })

  const workItems: WorkItem[] = useMemo(() => wiData ?? [], [wiData])
  const timelineTasks: TimelineTaskEvent[] = useMemo(() => tlData ?? [], [tlData])

  // Work item events
  const workItemEvents = useMemo(() => workItems
    .filter(item => activeStatuses.has(item.status))
    .map(item => {
      const start = new Date(item.createdAt)
      const end = item.dueDate ? new Date(item.dueDate) : new Date(item.createdAt)
      if (end < start) end.setTime(start.getTime())
      return {
        id: `wi-${item.id}`,
        title: `[${item.ticketNumber}] ${item.title}`,
        start, end,
        allDay: true,
        resource: { type: 'work-item', item },
      }
    }), [workItems, activeStatuses])

  // Timeline task events
  const timelineEvents = useMemo(() => {
    if (!showTimelineTasks) return []
    return timelineTasks.map(task => ({
      id: `tl-${task.id}`,
      title: task.status === 'milestone'
        ? `◆ ${task.label}`
        : `${task.label} (${task.workItem?.ticketNumber ?? ''})`,
      start: new Date(task.startDate),
      end: new Date(task.endDate),
      allDay: true,
      resource: { type: 'timeline', task },
    }))
  }, [timelineTasks, showTimelineTasks])

  const events = useMemo(() => [...workItemEvents, ...timelineEvents], [workItemEvents, timelineEvents])

  const eventStyleGetter = (event: any) => {
    const { type, item, task } = event.resource
    let backgroundColor = '#3b82f6'
    let opacity = 1

    if (type === 'work-item') {
      backgroundColor = STATUS_COLORS_HEX[item.status as WorkflowStatus] ?? '#3b82f6'
    } else if (type === 'timeline') {
      // Use task status color with slight transparency to differentiate from work items
      backgroundColor = TASK_STATUS_COLORS[task.status] ?? TIMELINE_COLOR_HEX[task.color] ?? '#3b82f6'
      opacity = 0.85
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity,
        color: 'white',
        border: type === 'timeline' ? '1px dashed rgba(255,255,255,0.4)' : '0px solid transparent',
        display: 'block',
        fontSize: '11px',
        fontWeight: 500,
        padding: '2px 5px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      }
    }
  }

  const handleSelectEvent = (event: any) => {
    const { type, item, task } = event.resource
    if (type === 'work-item') setSelectedItemId(item.id)
    else if (type === 'timeline' && task.workItem?.id) setSelectedItemId(task.workItem.id)
  }

  const toggleStatus = (status: WorkflowStatus) => {
    const next = new Set(activeStatuses)
    if (next.has(status)) next.delete(status); else next.add(status)
    setActiveStatuses(next)
  }

  const isLoading = wiLoading || tlLoading

  const CustomToolbar = (toolbar: any) => (
    <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
      <div className="flex items-center gap-3">
        <button onClick={() => toolbar.onNavigate('TODAY')}
          className="px-3 py-1.5 text-sm font-medium border border-border rounded-md hover:bg-muted transition-colors">
          Today
        </button>
        <div className="flex items-center gap-1">
          <button onClick={() => toolbar.onNavigate('PREV')} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"><ChevronLeft size={18} /></button>
          <button onClick={() => toolbar.onNavigate('NEXT')} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"><ChevronRight size={18} /></button>
        </div>
        <h2 className="text-xl font-normal text-foreground ml-1">{format(toolbar.date, 'MMMM yyyy')}</h2>
      </div>
      <select value={toolbar.view} onChange={(e) => toolbar.onView(e.target.value)}
        className="input py-1.5 px-3 text-sm rounded-md w-32 bg-background border border-border">
        <option value="month">Month</option>
        <option value="week">Week</option>
        <option value="day">Day</option>
        <option value="agenda">Agenda</option>
      </select>
    </div>
  )

  return (
    <>
      <div className="flex h-[calc(100vh-3.5rem)] -m-4 lg:-m-6 bg-background">
        {/* Left Sidebar */}
        <div className="w-64 flex-shrink-0 border-r border-border flex flex-col">
          <div className="p-4 lg:p-6 pb-2 space-y-2">
            <button
              onClick={() => exportToCSV(workItems.map(i => ({
                ID: i.ticketNumber, Title: i.title,
                Status: STATUS_LABELS[i.status as WorkflowStatus],
                Priority: i.priority, Requester: i.requesterName,
                Department: i.department?.name, Vendor: i.vendor?.name,
                DueDate: i.dueDate, Created: i.createdAt,
              })), 'calendar_requests_export')}
              className="flex items-center gap-2 px-4 py-2 hover:bg-muted rounded-full transition-colors text-foreground w-max font-medium text-sm">
              <Download size={18} className="text-muted-foreground mr-1" />
              Export CSV
            </button>
          </div>

          <div className="p-4 lg:p-6 pt-4 flex-1 overflow-y-auto space-y-6">
            {/* Work items section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CalendarIcon size={13} className="text-muted-foreground" />
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Work Items</h3>
              </div>
              <div className="space-y-2">
                {Object.values(WorkflowStatus).map(status => (
                  <label key={status} className="flex items-center gap-3 cursor-pointer group">
                    <div className={cn('w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-colors',
                      activeStatuses.has(status) ? 'border-transparent' : 'border-muted-foreground/40')}
                      style={{ backgroundColor: activeStatuses.has(status) ? STATUS_COLORS_HEX[status] : 'transparent' }}>
                      {activeStatuses.has(status) && <Check size={10} className="text-white" />}
                    </div>
                    <span className="text-xs text-foreground/80 group-hover:text-foreground transition-colors select-none">
                      {STATUS_LABELS[status]}
                    </span>
                    <input type="checkbox" className="hidden" checked={activeStatuses.has(status)} onChange={() => toggleStatus(status)} />
                  </label>
                ))}
              </div>
            </div>

            {/* Timeline tasks section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layers size={13} className="text-muted-foreground" />
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Timeline Tasks</h3>
              </div>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={cn('w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-colors',
                  showTimelineTasks ? 'border-transparent bg-primary' : 'border-muted-foreground/40')}>
                  {showTimelineTasks && <Check size={10} className="text-white" />}
                </div>
                <span className="text-xs text-foreground/80 group-hover:text-foreground transition-colors select-none">
                  Show Timeline Tasks
                </span>
                <input type="checkbox" className="hidden" checked={showTimelineTasks} onChange={() => setShowTimelineTasks(v => !v)} />
              </label>

              {showTimelineTasks && (
                <div className="mt-3 space-y-1.5 pl-1">
                  {Object.entries(TASK_STATUS_COLORS).map(([s, hex]) => (
                    <div key={s} className="flex items-center gap-2">
                      {s === 'milestone'
                        ? <div className="w-2.5 h-2.5 rotate-45 flex-shrink-0" style={{ backgroundColor: hex, borderRadius: 1 }} />
                        : <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: hex }} />
                      }
                      <span className="text-[11px] text-muted-foreground capitalize">{s.replace('_', ' ')}</span>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground/60 mt-2 italic">Dashed border = timeline task</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Calendar */}
        <div className="flex-1 flex flex-col min-w-0 p-4 lg:p-6 overflow-hidden bg-background">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground animate-pulse">Loading Calendar...</div>
          ) : (
            <div className="flex-1 h-full google-calendar-theme">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventStyleGetter}
                components={{ toolbar: CustomToolbar }}
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}
                popup
              />
            </div>
          )}
        </div>
      </div>

      <TicketDetailDrawer itemId={selectedItemId} onClose={() => setSelectedItemId(null)} />

      <style dangerouslySetInnerHTML={{ __html: `
        .google-calendar-theme .rbc-calendar { border: none; font-family: inherit; }
        .google-calendar-theme .rbc-header { border: none; border-left: 1px solid var(--border); padding: 8px 0; font-weight: 500; font-size: 11px; text-transform: uppercase; color: var(--muted-foreground); }
        .google-calendar-theme .rbc-header + .rbc-header { border-left: 1px solid var(--border); }
        .google-calendar-theme .rbc-month-view { border: none; border-top: 1px solid var(--border); border-left: 1px solid var(--border); border-radius: 0; }
        .google-calendar-theme .rbc-day-bg { border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); border-left: none; }
        .google-calendar-theme .rbc-month-row { border-top: none; }
        .google-calendar-theme .rbc-date-cell { padding: 4px 8px; font-size: 12px; font-weight: 500; color: var(--foreground); }
        .google-calendar-theme .rbc-today { background: transparent; }
        .google-calendar-theme .rbc-today .rbc-date-cell a { background: var(--primary); color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-center: center; margin-top: 2px; }
        .google-calendar-theme .rbc-event { padding: 2px 6px; }
        .google-calendar-theme .rbc-off-range-bg { background: transparent; }
        .google-calendar-theme .rbc-off-range { color: var(--muted-foreground); opacity: 0.5; }
        .google-calendar-theme .rbc-day-slot .rbc-time-slot { border-top: 1px solid var(--border); opacity: 0.5; }
        .google-calendar-theme .rbc-time-content { border-top: 1px solid var(--border); }
        .google-calendar-theme .rbc-day-bg + .rbc-day-bg { border-left: none; }
      ` }} />
    </>
  )
}
