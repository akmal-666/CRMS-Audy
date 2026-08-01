'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Activity, CheckCircle2, MessageSquare, FileText, UserPlus } from 'lucide-react'

interface RecentActivityProps {
  data: any[]
  isLoading: boolean
}

const ACTION_ICONS: Record<string, any> = {
  created: FileText,
  status_changed: Activity,
  comment_added: MessageSquare,
  assigned: UserPlus,
  completed: CheckCircle2,
}

export function RecentActivity({ data, isLoading }: RecentActivityProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const formatTimeAgo = (date: any) => {
    if (!mounted) return '...' // avoid SSR mismatch
    try {
      const now = Date.now()
      const then = new Date(date).getTime()
      const diff = Math.floor((now - then) / 1000)
      if (diff < 60) return 'just now'
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
      if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
      return new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    } catch {
      return 'recently'
    }
  }

  if (isLoading) {
    return (
      <div className="card h-[500px] animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="card h-[500px] flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
        <button className="text-xs text-primary hover:underline">View all activity</button>
      </div>

      {!data || data.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
          No recent activity
        </div>
      ) : (
        <div className="space-y-3 overflow-auto flex-1">
          {data.map((activity, index) => {
            const Icon = ACTION_ICONS[activity.action] || Activity

            return (
              <motion.div
                key={`${activity.ticketNumber}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon size={14} className="text-primary" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-foreground">
                      {activity.ticketNumber}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimeAgo(activity.createdAt)}
                    </span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {activity.description}
                  </p>

                  {activity.userName && (
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      by {activity.userName}
                    </p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
