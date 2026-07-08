'use client'

import { BarChart3, Calendar, Clock, AlertTriangle, Zap, Activity } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'

interface Assessment {
  estimatedManDays?: number
  estimatedHours?: number
  targetGoLive?: string
  complexity?: string
  risk?: string
  impact?: string
  technicalNotes?: string
}

const LEVEL_COLORS: Record<string, string> = {
  low: 'text-green-600 bg-green-100',
  medium: 'text-amber-600 bg-amber-100',
  high: 'text-orange-600 bg-orange-100',
  critical: 'text-red-600 bg-red-100',
}

export function AssessmentPanel({ assessment }: { assessment: Assessment }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
        <BarChart3 size={14} />
        Assessment
      </h4>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {assessment.estimatedManDays && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Clock size={14} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Man Days</p>
              <p className="font-medium">{assessment.estimatedManDays}</p>
            </div>
          </div>
        )}

        {assessment.estimatedHours && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Activity size={14} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Est. Hours</p>
              <p className="font-medium">{assessment.estimatedHours}h</p>
            </div>
          </div>
        )}

        {assessment.targetGoLive && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Calendar size={14} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Target Go Live</p>
              <p className="font-medium">{formatDate(assessment.targetGoLive)}</p>
            </div>
          </div>
        )}

        {assessment.complexity && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Zap size={14} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Complexity</p>
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium capitalize', LEVEL_COLORS[assessment.complexity])}>
                {assessment.complexity}
              </span>
            </div>
          </div>
        )}

        {assessment.risk && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <AlertTriangle size={14} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Risk</p>
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium capitalize', LEVEL_COLORS[assessment.risk])}>
                {assessment.risk}
              </span>
            </div>
          </div>
        )}

        {assessment.impact && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Activity size={14} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Impact</p>
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium capitalize', LEVEL_COLORS[assessment.impact])}>
                {assessment.impact}
              </span>
            </div>
          </div>
        )}
      </div>

      {assessment.technicalNotes && (
        <div className="mt-3 p-3 rounded-lg bg-muted/50">
          <p className="text-xs font-medium text-muted-foreground mb-1">Technical Notes</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{assessment.technicalNotes}</p>
        </div>
      )}
    </div>
  )
}
