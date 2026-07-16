'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2, Calendar as CalendarIcon, List, ArrowLeft } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { STATUS_LABELS, STATUS_COLORS, formatDate, cn } from '@/lib/utils'
import { WorkflowStatus, Priority } from '@crms/types'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format } from 'date-fns/format'
import { parse } from 'date-fns/parse'
import { startOfWeek } from 'date-fns/startOfWeek'
import { getDay } from 'date-fns/getDay'
import { enUS } from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'

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

export function PublicTracker() {
  const [email, setEmail] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  const { data: items, isLoading, error } = useQuery({
    queryKey: ['public-track', submittedEmail],
    queryFn: () => apiGet<any[]>('/api/work-items/public/track', { email: submittedEmail }),
    enabled: !!submittedEmail,
    select: (res) => res.data ?? [],
    retry: false
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) return
    setSubmittedEmail(email.trim())
  }

  const events = (items ?? []).map(item => ({
    id: item.id,
    title: item.title,
    start: new Date(item.createdAt),
    end: item.dueDate ? new Date(item.dueDate) : new Date(item.createdAt),
    resource: item
  }))

  const eventStyleGetter = (event: any) => {
    const item = event.resource
    let backgroundColor = '#64748b' // default slate
    if (item.status === 'in_pipeline') backgroundColor = '#94a3b8'
    else if (item.status === 'assessment') backgroundColor = '#3b82f6'
    else if (item.status === 'development') backgroundColor = '#8b5cf6'
    else if (item.status === 'uat') backgroundColor = '#f59e0b'
    else if (item.status === 'deployment') backgroundColor = '#f97316'
    else if (item.status === 'go_live') backgroundColor = '#22c55e'
    else if (item.status === 'drop') backgroundColor = '#ef4444'

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '12px',
        padding: '2px 6px'
      }
    }
  }

  if (!submittedEmail) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-4 shadow-soft-lg">
            <Search className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Track My Request</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Enter your email address to view the status of all IT requests you have submitted.
          </p>
        </div>

        <form onSubmit={handleSearch} className="card p-6 md:p-8 space-y-6">
          <div>
            <label className="label">Email Address</label>
            <input 
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input text-lg py-3" 
              placeholder="e.g. john@company.com" 
            />
          </div>
          <button type="submit" className="btn-primary w-full py-3 text-sm font-medium">
            Find My Requests
          </button>
          <div className="text-center mt-4">
            <a href="/submit" className="text-sm text-primary hover:underline">Or submit a new request</a>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button 
            onClick={() => setSubmittedEmail('')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Search
          </button>
          <h1 className="text-2xl font-bold text-foreground">My Requests</h1>
          <p className="text-sm text-muted-foreground">Showing requests for <span className="font-medium text-foreground">{submittedEmail}</span></p>
        </div>
        
        <div className="flex bg-muted p-1 rounded-lg">
          <button
            onClick={() => setViewMode('list')}
            className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2', viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            <List size={14} /> List
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2', viewMode === 'calendar' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            <CalendarIcon size={14} /> Calendar
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : error ? (
        <div className="card text-center py-12 text-danger">
          Failed to load your requests. Please try again later.
        </div>
      ) : items?.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Requests Found</h3>
          <p className="text-muted-foreground text-sm">We couldn't find any requests associated with {submittedEmail}.</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid gap-4"
            >
              {items?.map(item => (
                <div key={item.id} className="card p-0 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-5 border-b border-border/50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs font-mono text-muted-foreground">{item.ticketNumber}</span>
                        <h3 className="text-base font-semibold text-foreground mt-1 leading-snug">{item.title}</h3>
                      </div>
                      <span className={cn('badge', STATUS_COLORS[item.status as WorkflowStatus])}>
                        {STATUS_LABELS[item.status as WorkflowStatus]}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 bg-muted/20 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Created</p>
                      <p className="font-medium text-foreground">{formatDate(item.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Target Go-Live</p>
                      <p className="font-medium text-foreground">{item.dueDate ? formatDate(item.dueDate) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Manager</p>
                      <p className="font-medium text-foreground">{item.manager?.name || 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Department</p>
                      <p className="font-medium text-foreground">{item.department?.name || '—'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="card p-4 h-[600px] google-calendar-theme"
            >
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                eventPropGetter={eventStyleGetter}
                views={['month', 'week', 'agenda']}
                defaultView="month"
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .google-calendar-theme .rbc-calendar { border: none; font-family: inherit; }
        .google-calendar-theme .rbc-header { padding: 8px 0; font-weight: 500; text-transform: uppercase; font-size: 0.75rem; color: var(--muted-foreground); border-bottom: 1px solid var(--border); }
        .google-calendar-theme .rbc-month-view, .google-calendar-theme .rbc-time-view, .google-calendar-theme .rbc-agenda-view { border: 1px solid var(--border); border-radius: 0.5rem; overflow: hidden; background: var(--card); }
        .google-calendar-theme .rbc-day-bg { border-left: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .google-calendar-theme .rbc-day-bg + .rbc-day-bg { border-left: 1px solid var(--border); }
        .google-calendar-theme .rbc-month-row + .rbc-month-row { border-top: 1px solid var(--border); }
        .google-calendar-theme .rbc-date-cell { padding: 4px 8px; font-size: 0.875rem; color: var(--foreground); font-weight: 500; }
        .google-calendar-theme .rbc-off-range-bg { background-color: var(--muted); opacity: 0.3; }
        .google-calendar-theme .rbc-today { background-color: rgba(79, 70, 229, 0.05); }
        .google-calendar-theme .rbc-event { padding: 2px 6px; }
      `}} />
    </div>
  )
}
