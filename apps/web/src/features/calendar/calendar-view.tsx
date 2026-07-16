'use client'

import { useState, useMemo } from 'react'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, addMonths, subMonths } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { STATUS_LABELS } from '@/lib/utils'
import { WorkflowStatus } from '@crms/types'
import { TicketDetailDrawer } from '../tickets/ticket-detail-drawer'
import { Plus, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface WorkItem {
  id: string
  ticketNumber: string
  title: string
  status: WorkflowStatus
  createdAt: string
  dueDate?: string
}

const STATUS_COLORS_HEX: Record<WorkflowStatus, string> = {
  [WorkflowStatus.IN_PIPELINE]: '#94a3b8',
  [WorkflowStatus.ASSESSMENT]: '#3b82f6',
  [WorkflowStatus.DEVELOPMENT]: '#8b5cf6',
  [WorkflowStatus.UAT]: '#f59e0b',
  [WorkflowStatus.DEPLOYMENT]: '#f97316',
  [WorkflowStatus.GO_LIVE]: '#22c55e',
  [WorkflowStatus.DROP]: '#ef4444',
}

export function CalendarView() {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [activeStatuses, setActiveStatuses] = useState<Set<WorkflowStatus>>(
    new Set(Object.values(WorkflowStatus))
  )
  const [view, setView] = useState<View>('month')
  const [date, setDate] = useState(new Date())

  const { data, isLoading } = useQuery({
    queryKey: ['work-items', 'calendar'],
    queryFn: () => apiGet<WorkItem[]>('/api/work-items', { pageSize: 500 }),
    select: (res) => (res as any).data ?? [],
  })

  const workItems: WorkItem[] = data ?? []

  // Filter events based on active statuses
  const events = useMemo(() => {
    return workItems
      .filter(item => activeStatuses.has(item.status))
      .map(item => {
        const start = new Date(item.createdAt)
        const end = item.dueDate ? new Date(item.dueDate) : new Date(item.createdAt)
        // Ensure end date is at least the start date to render correctly
        if (end < start) end.setTime(start.getTime())
        
        return {
          id: item.id,
          title: item.title,
          start,
          end,
          allDay: true, // Make them solid blocks
          resource: item,
        }
      })
  }, [workItems, activeStatuses])

  const eventStyleGetter = (event: any) => {
    const item = event.resource as WorkItem
    const backgroundColor = STATUS_COLORS_HEX[item.status] || '#3b82f6'

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 1,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '11px',
        fontWeight: 500,
        padding: '2px 4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
      }
    }
  }

  const toggleStatus = (status: WorkflowStatus) => {
    const next = new Set(activeStatuses)
    if (next.has(status)) {
      next.delete(status)
    } else {
      next.add(status)
    }
    setActiveStatuses(next)
  }

  const CustomToolbar = (toolbar: any) => {
    const goToBack = () => toolbar.onNavigate('PREV')
    const goToNext = () => toolbar.onNavigate('NEXT')
    const goToCurrent = () => toolbar.onNavigate('TODAY')
    const label = () => {
      const date = toolbar.date
      return format(date, 'MMMM yyyy')
    }

    return (
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
        <div className="flex items-center gap-4">
          <button 
            onClick={goToCurrent}
            className="px-3 py-1.5 text-sm font-medium border border-border rounded-md hover:bg-muted transition-colors text-foreground"
          >
            Today
          </button>
          <div className="flex items-center gap-1">
            <button onClick={goToBack} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors">
              <ChevronLeft size={20} />
            </button>
            <button onClick={goToNext} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
          <h2 className="text-xl font-normal text-foreground ml-2">{label()}</h2>
        </div>

        <div className="flex items-center gap-2">
          <select 
            value={toolbar.view} 
            onChange={(e) => toolbar.onView(e.target.value)}
            className="input py-1.5 px-3 text-sm rounded-md w-32 bg-background border border-border"
          >
            <option value="month">Month</option>
            <option value="week">Week</option>
            <option value="day">Day</option>
            <option value="agenda">Agenda</option>
          </select>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex h-full -m-4 lg:-m-6 bg-background">
        {/* Left Sidebar (Google Calendar style) */}
        <div className="w-64 flex-shrink-0 border-r border-border flex flex-col">
          <div className="p-4 lg:p-6 pb-2">
            <Link 
              href="/requests/new" 
              className="flex items-center gap-2 px-4 py-3 bg-card border border-border shadow-sm rounded-full hover:shadow-md transition-shadow text-foreground w-max font-medium text-sm"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" className="text-primary mr-1"><path fill="currentColor" d="M20 13h-7v7h-2v-7H4v-2h7V4h2v7h7v2z"></path></svg>
              Create
            </Link>
          </div>
          
          <div className="p-4 lg:p-6 pt-6 flex-1 overflow-y-auto">
            <h3 className="text-sm font-medium text-foreground mb-4">My calendars</h3>
            <div className="space-y-2.5">
              {Object.values(WorkflowStatus).map(status => (
                <label key={status} className="flex items-center gap-3 cursor-pointer group">
                  <div 
                    className={cn(
                      "w-4 h-4 rounded-sm flex items-center justify-center border transition-colors",
                      activeStatuses.has(status) 
                        ? "border-transparent" 
                        : "border-muted-foreground/40 group-hover:border-muted-foreground/60"
                    )}
                    style={{ backgroundColor: activeStatuses.has(status) ? STATUS_COLORS_HEX[status] : 'transparent' }}
                  >
                    {activeStatuses.has(status) && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors select-none">
                    {STATUS_LABELS[status]}
                  </span>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={activeStatuses.has(status)}
                    onChange={() => toggleStatus(status)}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Main Calendar Area */}
        <div className="flex-1 flex flex-col min-w-0 p-4 lg:p-6 overflow-hidden bg-background">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground animate-pulse">
              Loading Calendar...
            </div>
          ) : (
            <div className="flex-1 h-full google-calendar-theme">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                onSelectEvent={(event) => setSelectedItemId(event.resource.id)}
                eventPropGetter={eventStyleGetter}
                components={{
                  toolbar: CustomToolbar
                }}
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

      <TicketDetailDrawer
        itemId={selectedItemId}
        onClose={() => setSelectedItemId(null)}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .google-calendar-theme .rbc-calendar {
          border: none;
          font-family: inherit;
        }
        .google-calendar-theme .rbc-header {
          border: none;
          border-left: 1px solid var(--border);
          padding: 8px 0;
          font-weight: 500;
          font-size: 11px;
          text-transform: uppercase;
          color: var(--muted-foreground);
        }
        .google-calendar-theme .rbc-header + .rbc-header {
          border-left: 1px solid var(--border);
        }
        .google-calendar-theme .rbc-month-view {
          border: none;
          border-top: 1px solid var(--border);
          border-left: 1px solid var(--border);
          border-radius: 0;
        }
        .google-calendar-theme .rbc-day-bg {
          border-right: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          border-left: none;
        }
        .google-calendar-theme .rbc-month-row {
          border-top: none;
        }
        .google-calendar-theme .rbc-date-cell {
          padding: 4px 8px;
          font-size: 12px;
          font-weight: 500;
          color: var(--foreground);
        }
        .google-calendar-theme .rbc-today {
          background: transparent;
        }
        .google-calendar-theme .rbc-today .rbc-date-cell {
          position: relative;
        }
        .google-calendar-theme .rbc-today .rbc-date-cell a {
          background: var(--primary);
          color: white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
        }
        .google-calendar-theme .rbc-event {
          padding: 2px 6px;
        }
        .google-calendar-theme .rbc-off-range-bg {
          background: transparent;
        }
        .google-calendar-theme .rbc-off-range {
          color: var(--muted-foreground);
          opacity: 0.5;
        }
        .google-calendar-theme .rbc-day-slot .rbc-time-slot {
          border-top: 1px solid var(--border);
          opacity: 0.5;
        }
        .google-calendar-theme .rbc-time-header.rbc-overflowing {
          border-right: 1px solid var(--border);
        }
        .google-calendar-theme .rbc-time-content {
          border-top: 1px solid var(--border);
        }
        /* Fix overlapping borders */
        .google-calendar-theme .rbc-day-bg + .rbc-day-bg {
          border-left: none;
        }
      ` }} />
    </>
  )
}
