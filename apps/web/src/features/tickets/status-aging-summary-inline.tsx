'use client'

import { useMemo } from 'react'
import { Clock, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDate, STATUS_LABELS, cn } from '@/lib/utils'
import { WorkflowStatus } from '@crms/types'
import { useState } from 'react'

interface ActivityLog {
  id: string
  action: string
  description: string
  metadata?: Record<string, unknown>
  createdAt: string
}

interface StatusAgingSummaryInlineProps {
  logs: ActivityLog[]
  currentStatus: string
  createdAt: string
  goLiveDate?: string
}

interface StatusPeriod {
  status: WorkflowStatus
  startDate: Date
  endDate: Date | null
  durationDays: number
}

export function StatusAgingSummaryInline({ logs, currentStatus, createdAt, goLiveDate }: StatusAgingSummaryInlineProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const statusPeriods = useMemo(() => {
    // Parse activity logs to get status change timeline
    const statusChanges: Array<{ status: string; timestamp: Date }> = [
      { status: 'in_pipeline', timestamp: new Date(createdAt) }
    ]

    // Extract status changes from activity logs
    logs
      .filter(log => log.action === 'status_changed' && log.metadata?.to)
      .forEach(log => {
        statusChanges.push({
          status: log.metadata!.to as string,
          timestamp: new Date(log.createdAt)
        })
      })

    // Sort by timestamp
    statusChanges.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    // Calculate periods for each status
    const periods: StatusPeriod[] = []
    
    for (let i = 0; i < statusChanges.length; i++) {
      const change = statusChanges[i]
      const nextChange = statusChanges[i + 1]
      
      const startDate = change.timestamp
      const endDate = nextChange ? nextChange.timestamp : null
      
      // Calculate duration in days
      const durationMs = endDate 
        ? endDate.getTime() - startDate.getTime()
        : Date.now() - startDate.getTime()
      const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24))

      periods.push({
        status: change.status as WorkflowStatus,
        startDate,
        endDate,
        durationDays: Math.max(durationDays, 0)
      })
    }

    return periods
  }, [logs, createdAt])

  // Calculate total duration
  const totalDuration = useMemo(() => {
    if (statusPeriods.length === 0) return 0
    const firstDate = statusPeriods[0].startDate
    const lastDate = goLiveDate 
      ? new Date(goLiveDate)
      : new Date()
    const durationMs = lastDate.getTime() - firstDate.getTime()
    return Math.ceil(durationMs / (1000 * 60 * 60 * 24))
  }, [statusPeriods, goLiveDate])

  if (statusPeriods.length === 0) return null

  const isGoLive = currentStatus === WorkflowStatus.GO_LIVE
  const isDrop = currentStatus === WorkflowStatus.DROP

  return (
    <div className="mb-4 p-3 rounded-lg border border-primary/20 bg-primary/5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left mb-2"
      >
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-primary" />
          <span className="text-xs font-semibold text-foreground">
            {isGoLive ? 'Duration Summary' : 'Progress Duration'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Total: <strong className="text-primary">{totalDuration} {totalDuration === 1 ? 'day' : 'days'}</strong>
          </span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {isExpanded && (
        <div className="space-y-2 mt-3">
          {statusPeriods.map((period, index) => {
            const isActive = !period.endDate && currentStatus === period.status
            const statusLabel = STATUS_LABELS[period.status] || period.status
            
            return (
              <div 
                key={`${period.status}-${index}`}
                className={cn(
                  'flex items-center justify-between gap-3 p-2 rounded-md text-xs transition-colors',
                  isActive 
                    ? 'bg-primary/10 border border-primary/30' 
                    : 'bg-card/50'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-medium text-foreground">{statusLabel}</span>
                    {isActive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Calendar size={10} />
                    <span>
                      {formatDate(period.startDate.toISOString(), 'dd MMM yyyy')}
                      {' → '}
                      {period.endDate 
                        ? formatDate(period.endDate.toISOString(), 'dd MMM yyyy')
                        : 'Present'
                      }
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className={cn(
                    'font-semibold',
                    isActive ? 'text-primary' : 'text-foreground'
                  )}>
                    {period.durationDays}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {period.durationDays === 1 ? 'day' : 'days'}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Total Duration Bar */}
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-[11px] text-muted-foreground">
                  {formatDate(statusPeriods[0].startDate.toISOString(), 'dd MMM yyyy')}
                  {' → '}
                  {goLiveDate 
                    ? formatDate(goLiveDate, 'dd MMM yyyy')
                    : 'Present'
                  }
                </span>
              </div>
              <div className="font-bold text-primary">
                {totalDuration} {totalDuration === 1 ? 'day' : 'days'}
              </div>
            </div>
          </div>

          {!isGoLive && !isDrop && (
            <p className="text-[10px] text-muted-foreground italic pt-1">
              * Duration calculated until Go Live
            </p>
          )}
        </div>
      )}
    </div>
  )
}
