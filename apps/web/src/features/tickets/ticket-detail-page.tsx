'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, Edit2, Check, X, ChevronDown, Paperclip, Download, FileText } from 'lucide-react'
import { apiGet, apiPatch, apiPut } from '@/lib/api'
import { WorkflowStatus, Priority, UserRole } from '@crms/types'
import {
  STATUS_LABELS, STATUS_COLORS, STATUS_DOT_COLORS,
  PRIORITY_LABELS, PRIORITY_COLORS,
  formatDate, timeAgo, cn, getInitials
} from '@/lib/utils'
import { useAuth } from '@/context/auth-context'
import { ActivityTimeline } from './activity-timeline'
import { CommentSection } from './comment-section'
import { AssessmentPanel } from './assessment-panel'
import Link from 'next/link'
import { toast } from 'sonner'
import { useState } from 'react'
import { AssignSelect } from './assign-select'
import { FileUpload } from '@/components/file-upload'
import { apiGet as _apiGet } from '@/lib/api'

const WORKFLOW_TRANSITIONS: Record<string, WorkflowStatus[]> = {
  in_pipeline:  [WorkflowStatus.ASSESSMENT, WorkflowStatus.DROP],
  assessment:   [WorkflowStatus.DEVELOPMENT, WorkflowStatus.IN_PIPELINE, WorkflowStatus.DROP],
  development:  [WorkflowStatus.UAT, WorkflowStatus.DROP],
  uat:          [WorkflowStatus.DEPLOYMENT, WorkflowStatus.DEVELOPMENT, WorkflowStatus.DROP],
  deployment:   [WorkflowStatus.GO_LIVE, WorkflowStatus.DEVELOPMENT, WorkflowStatus.DROP],
  go_live:      [WorkflowStatus.DROP],
  drop:         [],
}

export function TicketDetailPage({ id }: { id: string }) {
  const { user } = useAuth()
  const canEditAssignment = user?.role === UserRole.ADMINISTRATOR || user?.role === UserRole.MANAGER
  const queryClient = useQueryClient()
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['work-item', id],
    queryFn: () => apiGet<any>(`/api/work-items/${id}`),
  })

  const item = data?.data

  const updateStatus = useMutation({
    mutationFn: (status: string) => apiPatch(`/api/work-items/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item', id] })
      queryClient.invalidateQueries({ queryKey: ['work-items'] })
      toast.success('Status updated')
      setStatusMenuOpen(false)
    },
    onError: () => toast.error('Failed to update status'),
  })

  if (isLoading) return <DetailSkeleton />
  if (!item) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">Request not found</p>
      <Link href="/requests" className="btn-primary mt-4 inline-block">Back to requests</Link>
    </div>
  )

  const canChangeStatus = user && [UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.BUSINESS_ANALYST, UserRole.DEVELOPER, UserRole.QA].includes(user.role as UserRole)
  const canEditAssessment = user && [UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.BUSINESS_ANALYST, UserRole.VENDOR].includes(user.role as UserRole)
  const allowedTransitions = WORKFLOW_TRANSITIONS[item.status] ?? []

  return (
    <div className="max-w-4xl space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/requests" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft size={14} /> All Requests
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{item.ticketNumber}</span>
      </div>

      {/* Header card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-mono text-muted-foreground">{item.ticketNumber}</span>
              <span className={cn('badge', STATUS_COLORS[item.status as WorkflowStatus])}>
                <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT_COLORS[item.status as WorkflowStatus])} />
                {STATUS_LABELS[item.status as WorkflowStatus]}
              </span>
              <span className={cn('badge', PRIORITY_COLORS[item.priority as Priority])}>
                {PRIORITY_LABELS[item.priority as Priority]}
              </span>
            </div>
            <h1 className="text-xl font-semibold text-foreground leading-snug">{item.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Submitted by <strong>{item.requesterName}</strong> · {timeAgo(item.createdAt)}
            </p>
          </div>

          {/* Status change button */}
          {canChangeStatus && allowedTransitions.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setStatusMenuOpen(!statusMenuOpen)}
                className="btn-primary flex items-center gap-1.5 text-sm"
              >
                Move to <ChevronDown size={13} />
              </button>
              {statusMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setStatusMenuOpen(false)} />
                  <div className="absolute right-0 mt-1 w-44 bg-card border border-border rounded-xl shadow-soft-lg z-20 overflow-hidden py-1">
                    {allowedTransitions.map(s => (
                      <button
                        key={s}
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate(s)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                      >
                        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', STATUS_DOT_COLORS[s])} />
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left: main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Problem Description</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{item.problemDescription}</p>
            </div>
            {item.expectedSolution && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Expected Solution</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.expectedSolution}</p>
              </div>
            )}
            {item.businessProcess && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Business Process</h3>
                <p className="text-sm text-muted-foreground">{item.businessProcess}</p>
              </div>
            )}
          </motion.div>

          {/* Assessment */}
          {(item.assessment || canEditAssessment) && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
              <AssessmentPanel assessment={item.assessment} workItemId={id} canEdit={!!canEditAssessment} />
            </motion.div>
          )}

          {/* Comments */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card">
            <CommentSection workItemId={id} comments={item.comments ?? []} />
          </motion.div>

          {/* Activity */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
            <ActivityTimeline logs={item.activityLogs ?? []} />
          </motion.div>
        </div>

        {/* Right: sidebar info */}
        <div className="space-y-4">
          {/* Details */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Details</h3>
            <div className="space-y-2.5 text-sm">
              <InfoItem label="Department" value={item.department?.name} />
              <InfoItem label="Branch" value={item.branch?.name} />
              <InfoItem label="Created" value={formatDate(item.createdAt)} />
              {item.goLiveDate && <InfoItem label="Go-Live" value={formatDate(item.goLiveDate)} />}
              <InfoItem label="Due Date" value={item.dueDate ? formatDate(item.dueDate) : undefined} />
              <InfoItem label="Requester" value={item.requesterName} />
              <InfoItem label="Email" value={item.requesterEmail} />
            </div>
          </motion.div>

          {/* Team */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Team</h3>
            <div className="space-y-4">
              <AssignSelect workItemId={id} label="Manager" field="managerId" currentUser={item.manager} canEdit={canEditAssignment} />
              <AssignSelect workItemId={id} label="Developer" field="developerId" currentUser={item.developer} canEdit={canEditAssignment} />
              <AssignSelect workItemId={id} label="Business Analyst" field="businessAnalystId" currentUser={item.businessAnalyst} canEdit={canEditAssignment} />
              <AssignSelect workItemId={id} label="QA" field="qaId" currentUser={item.qa} canEdit={canEditAssignment} />
              {item.vendor && <AssigneeItem label="Platform / Vendor" user={item.vendor} />}
            </div>
          </motion.div>

          {/* Attachments */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Paperclip size={14} className="text-muted-foreground" />
                Attachments {item.attachments?.length > 0 && `(${item.attachments.length})`}
              </h3>
            </div>

            {item.attachments?.length > 0 && (
              <div className="space-y-1">
                {item.attachments.map((att: any) => (
                  <div key={att.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <FileText size={14} className="text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{att.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : ''}
                        {att.uploader?.name ? ` · ${att.uploader.name}` : ''}
                      </p>
                    </div>
                    <a
                      href={`/api/work-items/${id}/attachments/${att.id}/download`}
                      target="_blank" rel="noreferrer"
                      className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      title="Download"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                ))}
              </div>
            )}

            <FileUpload
              workItemId={id}
              onUploaded={() => {}}
            />
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-foreground font-medium text-right">{value || '—'}</span>
    </div>
  )
}

function AssigneeItem({ label, user }: { label: string; user?: { name: string; avatarUrl?: string } }) {
  if (!user) return <div className="flex justify-between gap-2 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-muted-foreground/50">Unassigned</span>
  </div>
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground flex-shrink-0">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
          {getInitials(user.name)[0]}
        </div>
        <span className="text-foreground font-medium">{user.name}</span>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="max-w-4xl space-y-4 animate-pulse">
      <div className="h-4 bg-muted rounded w-40" />
      <div className="card space-y-3">
        <div className="h-6 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="card h-40 bg-muted" />
          <div className="card h-32 bg-muted" />
        </div>
        <div className="card h-48 bg-muted" />
      </div>
    </div>
  )
}
