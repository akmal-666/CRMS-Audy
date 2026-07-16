'use client'

import { useState } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { STATUS_DOT_COLORS, STATUS_LABELS } from '@/lib/utils'
import { WorkflowStatus } from '@crms/types'
import { TicketDetailDrawer } from '../tickets/ticket-detail-drawer'
import { Filter, Search, Plus } from 'lucide-react'
import Link from 'next/link'

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

export function CalendarView() {
  const [search, setSearch] = useState('')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['work-items', 'calendar', search],
    queryFn: () => apiGet<WorkItem[]>('/api/work-items', { search: search || undefined, pageSize: 500 }),
    select: (res) => (res as any).data ?? [],
  })

  const workItems: WorkItem[] = data ?? []

  const events = workItems.map(item => ({
    id: item.id,
    title: `${item.ticketNumber} - ${item.title}`,
    start: new Date(item.createdAt),
    end: item.dueDate ? new Date(item.dueDate) : new Date(item.createdAt),
    resource: item,
  }))

  const eventStyleGetter = (event: any) => {
    const item = event.resource as WorkItem
    
    // Convert Tailwind bg-* classes to actual hex colors for the calendar
    let backgroundColor = '#3b82f6' // Default blue
    switch (item.status) {
      case WorkflowStatus.IN_PIPELINE: backgroundColor = '#94a3b8'; break // slate-400
      case WorkflowStatus.ASSESSMENT: backgroundColor = '#3b82f6'; break // blue-500
      case WorkflowStatus.DEVELOPMENT: backgroundColor = '#8b5cf6'; break // violet-500
      case WorkflowStatus.UAT: backgroundColor = '#f59e0b'; break // amber-500
      case WorkflowStatus.DEPLOYMENT: backgroundColor = '#f97316'; break // orange-500
      case WorkflowStatus.GO_LIVE: backgroundColor = '#22c55e'; break // green-500
      case WorkflowStatus.DROP: backgroundColor = '#ef4444'; break // red-500
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    }
  }

  return (
    <>
      <div className="flex flex-col h-full -m-4 lg:-m-6 bg-card">
        {/* Calendar toolbar */}
        <div className="flex items-center gap-3 px-4 lg:px-6 py-3 border-b border-border bg-card/50 backdrop-blur-sm z-10 sticky top-0">
          <div>
            <h1 className="text-base font-semibold text-foreground">Calendar Board</h1>
            <p className="text-xs text-muted-foreground">{workItems.length} active requests</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 w-40"
              />
            </div>
            
            <button className="btn-ghost text-xs flex items-center gap-1.5 py-1.5">
              <Filter size={13} />
              Filter
            </button>
            
            <Link href="/requests/new" className="btn-primary flex items-center gap-1.5 text-xs py-1.5">
              <Plus size={13} />
              <span className="hidden sm:inline">New Request</span>
            </Link>
          </div>
        </div>

        {/* Calendar content */}
        <div className="flex-1 p-4 lg:p-6 overflow-hidden">
          <div className="h-full bg-background rounded-xl border border-border overflow-hidden p-4 calendar-container">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground animate-pulse">
                Loading Calendar...
              </div>
            ) : (
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                onSelectEvent={(event) => setSelectedItemId(event.resource.id)}
                eventPropGetter={eventStyleGetter}
                views={['month', 'week', 'day', 'agenda']}
                defaultView="month"
              />
            )}
          </div>
        </div>
      </div>

      <TicketDetailDrawer
        itemId={selectedItemId}
        onClose={() => setSelectedItemId(null)}
      />
    </>
  )
}
