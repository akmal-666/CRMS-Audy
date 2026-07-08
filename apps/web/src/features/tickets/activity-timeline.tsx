'use client'

import { motion } from 'framer-motion'
import { Clock, User2, MessageSquare, FileUp, ArrowRight, GitMerge } from 'lucide-react'
import { timeAgo, getInitials, cn } from '@/lib/utils'

interface ActivityLog {
  id: string
  action: string
  description: string
  userId?: string
  guestName?: string
  user?: { id: string; name: string; avatarUrl?: string }
  metadata?: Record<string, unknown>
  createdAt: string
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  created: <GitMerge size={12} />,
  commented: <MessageSquare size={12} />,
  attachment_uploaded: <FileUp size={12} />,
  status_changed: <ArrowRight size={12} />,
  assigned: <User2 size={12} />,
  assessment_updated: <Clock size={12} />,
}

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-green-100 text-green-600',
  commented: 'bg-blue-100 text-blue-600',
  attachment_uploaded: 'bg-purple-100 text-purple-600',
  status_changed: 'bg-amber-100 text-amber-600',
  assigned: 'bg-indigo-100 text-indigo-600',
  assessment_updated: 'bg-slate-100 text-slate-600',
}

interface ActivityTimelineProps {
  logs: ActivityLog[]
}

export function ActivityTimeline({ logs }: ActivityTimelineProps) {
  if (logs.length === 0) return null

  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-3">Activity Timeline</h4>
      <div className="relative">
        {/* Line */}
        <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-3">
          {logs.map((log, i) => {
            const actorName = log.user?.name || log.guestName || 'System'
            const icon = ACTION_ICONS[log.action] ?? <Clock size={12} />
            const color = ACTION_COLORS[log.action] ?? 'bg-muted text-muted-foreground'

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex gap-3 pl-1"
              >
                <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 mt-0.5', color)}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-xs font-medium text-foreground">{actorName}</span>
                    <span className="text-xs text-muted-foreground">{log.description}</span>
                  </div>
                  <span className="text-xs text-muted-foreground/60">{timeAgo(log.createdAt)}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
