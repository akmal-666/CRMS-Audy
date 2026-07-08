'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { apiGet, apiPatch } from '@/lib/api'
import { timeAgo, cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function NotificationsPage() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiGet<any>('/api/notifications'),
  })

  const readAll = useMutation({
    mutationFn: () => apiPatch('/api/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('All notifications marked as read')
    },
  })

  const notifications = data?.data?.notifications ?? []
  const unread = data?.data?.unread ?? 0

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Notifications</h1>
          {unread > 0 && <p className="text-sm text-muted-foreground mt-0.5">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <button onClick={() => readAll.mutate()} className="btn-ghost flex items-center gap-1.5 text-xs">
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      <div className="card p-0 overflow-hidden divide-y divide-border">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3 p-4 animate-pulse">
              <div className="w-8 h-8 bg-muted rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-2.5 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))
        ) : notifications.length > 0 ? (
          notifications.map((n: any, i: number) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className={cn('flex gap-3 p-4 hover:bg-muted/30 transition-colors', !n.isRead && 'bg-primary/5')}
            >
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', n.isRead ? 'bg-muted' : 'bg-primary/20')}>
                <Bell size={14} className={n.isRead ? 'text-muted-foreground' : 'text-primary'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12">
            <Bell size={32} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
