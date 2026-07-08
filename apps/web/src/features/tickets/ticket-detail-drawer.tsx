'use client'

import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, formatDate, timeAgo, cn } from '@/lib/utils'
import { WorkflowStatus, Priority } from '@crms/types'
import { ActivityTimeline } from './activity-timeline'
import { CommentSection } from './comment-section'
import { AssessmentPanel } from './assessment-panel'
import Link from 'next/link'

interface TicketDetailDrawerProps {
  itemId: string | null
  onClose: () => void
}

export function TicketDetailDrawer({ itemId, onClose }: TicketDetailDrawerProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['work-item', itemId],
    queryFn: () => apiGet<any>(`/api/work-items/${itemId}`),
    enabled: !!itemId,
  })

  const item = data?.data

  return (
    <AnimatePresence>
      {itemId && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-card border-l border-border shadow-soft-lg flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              {item ? (
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono text-muted-foreground flex-shrink-0">{item.ticketNumber}</span>
                  <span className={cn('badge', STATUS_COLORS[item.status as WorkflowStatus])}>{STATUS_LABELS[item.status as WorkflowStatus]}</span>
                  <Link href={`/requests/${item.id}`} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                    <ExternalLink size={14} />
                  </Link>
                </div>
              ) : (
                <div className="h-5 bg-muted rounded w-40 animate-pulse" />
              )}
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <DrawerSkeleton />
              ) : item ? (
                <div className="divide-y divide-border">
                  {/* Title + description */}
                  <div className="px-5 py-4 space-y-3">
                    <h2 className="text-base font-semibold text-foreground leading-snug">{item.title}</h2>
                    <div className="flex flex-wrap gap-2">
                      <span className={cn('badge', PRIORITY_COLORS[item.priority as Priority])}>
                        {PRIORITY_LABELS[item.priority as Priority]}
                      </span>
                      {item.department && <span className="badge bg-muted text-muted-foreground">{item.department.name}</span>}
                      {item.branch && <span className="badge bg-muted text-muted-foreground">{item.branch.name}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.problemDescription}</p>
                    {item.expectedSolution && (
                      <div>
                        <p className="text-xs font-medium text-foreground mb-1">Expected Solution</p>
                        <p className="text-sm text-muted-foreground">{item.expectedSolution}</p>
                      </div>
                    )}
                  </div>

                  {/* Info grid */}
                  <div className="px-5 py-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <InfoRow label="Requester" value={item.requesterName} />
                      <InfoRow label="Email" value={item.requesterEmail} />
                      <InfoRow label="Created" value={formatDate(item.createdAt)} />
                      <InfoRow label="Due Date" value={item.dueDate ? formatDate(item.dueDate) : '—'} />
                      <InfoRow label="Manager" value={item.manager?.name || '—'} />
                      <InfoRow label="Developer" value={item.developer?.name || '—'} />
                      <InfoRow label="Business Analyst" value={item.businessAnalyst?.name || '—'} />
                      <InfoRow label="QA" value={item.qa?.name || '—'} />
                      {item.vendor && <InfoRow label="Vendor" value={item.vendor.name} />}
                    </div>
                  </div>

                  {/* Assessment */}
                  {item.assessment && (
                    <div className="px-5 py-4">
                      <AssessmentPanel assessment={item.assessment} />
                    </div>
                  )}

                  {/* Comments */}
                  <div className="px-5 py-4">
                    <CommentSection workItemId={item.id} comments={item.comments ?? []} />
                  </div>

                  {/* Activity timeline */}
                  <div className="px-5 py-4">
                    <ActivityTimeline logs={item.activityLogs ?? []} />
                  </div>
                </div>
              ) : null}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function DrawerSkeleton() {
  return (
    <div className="p-5 space-y-4 animate-pulse">
      <div className="h-6 bg-muted rounded w-3/4" />
      <div className="flex gap-2">
        <div className="h-5 bg-muted rounded-full w-16" />
        <div className="h-5 bg-muted rounded-full w-20" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded" />
        <div className="h-3 bg-muted rounded w-4/5" />
        <div className="h-3 bg-muted rounded w-3/5" />
      </div>
    </div>
  )
}
