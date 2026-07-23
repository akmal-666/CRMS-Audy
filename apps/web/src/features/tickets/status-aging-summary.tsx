'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Clock, Calendar } from 'lucide-react'
import { formatDate, STATUS_LABELS, cn } from '@/lib/utils'
import { WorkflowStatus } from '@crms/types'

interface ActivityLog {
  id: string
  action: string
  description: string
  metadata?: Record<string, unknown>
  createdAt: string
}

interface StatusAgingSummaryProps {
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

const STATUS_ORDER: WorkflowStatus[] = [
  WorkflowStatus.IN_PIPELINE,
  WorkflowStatus.ASSESSMENT,
  WorkflowStatus.DEVELOPMENT,
  WorkflowStatus.UAT,
  WorkflowStatus.DEPLOYMENT,
  WorkflowStatus.GO_LIVE,
]

export function StatusAgingSummary({ logs, currentStatus, createdAt, goLiveDate }: StatusAgingSummaryProps) {
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
    <motion.div 
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay: 0.1 }}
      className="card space-y-4"
    >
      <div className="flex items-center gap-2">
        <Clock size={16} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          {isGoLive ? 'Request Duration Summary' : 'Current Progress Duration'}
        </h3>
      </div>

      <div className="space-y-3">
        {statusPeriods.map((period, index) => {
          const isActive = !period.endDate && currentStatus === period.status
          const statusLabel = STATUS_LABELS[period.status] || period.status
          
          return (
            <div 
              key={`${period.status}-${index}`}
              className={cn(
                'flex items-start justify-between gap-4 p-3 rounded-lg border transition-colors',
                isActive 
                  ? 'border-primary/30 bg-primary/5' 
                  : 'border-border bg-card hover:bg-muted/30'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">{statusLabel}</span>
                  {isActive && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                      Active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar size={12} />
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
                  'text-lg font-semibold',
                  isActive ? 'text-primary' : 'text-foreground'
                )}>
                  {period.durationDays}
                </div>
                <div className="text-xs text-muted-foreground">
                  {period.durationDays === 1 ? 'day' : 'days'}
                </div>
              </div>
            </div>
          )
        })}

        {/* Total Duration */}
        <div className="pt-3 border-t border-border">
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
            <div>
              <div className="text-sm font-semibold text-foreground mb-1">Total Duration</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar size={12} />
                <span>
                  {formatDate(statusPeriods[0].startDate.toISOString(), 'dd MMM yyyy')}
                  {' → '}
                  {goLiveDate 
                    ? formatDate(goLiveDate, 'dd MMM yyyy')
                    : 'Present'
                  }
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{totalDuration}</div>
              <div className="text-xs text-muted-foreground">
                {totalDuration === 1 ? 'day' : 'days'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!isGoLive && !isDrop && (
        <p className="text-xs text-muted-foreground italic">
          * Duration is calculated until the request reaches Go Live status
        </p>
      )}
    </motion.div>
  )
}
