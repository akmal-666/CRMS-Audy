'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, Paperclip, FileText, Download, CalendarRange, ChevronDown, ArrowRight, Loader2 } from 'lucide-react'
import { apiGet, apiPatch } from '@/lib/api'
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, formatDate, timeAgo, cn } from '@/lib/utils'
import { WorkflowStatus, Priority } from '@crms/types'
import { ActivityTimeline } from './activity-timeline'
import { CommentSection } from './comment-section'
import { AssessmentPanel } from './assessment-panel'
import Link from 'next/link'
import { useAuth } from '@/context/auth-context'
import { AssignSelect } from './assign-select'
import { MultiSelectBA } from './multi-select-ba'
import { MandaysEdit } from './mandays-edit'
import { EditableDetailField } from './editable-detail-field'
import { FileUpload } from '@/components/file-upload'
import { UserRole } from '@crms/types'
import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'

interface TicketDetailDrawerProps {
  itemId: string | null
  onClose: () => void
}

export function TicketDetailDrawer({ itemId, onClose }: TicketDetailDrawerProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [moveToOpen, setMoveToOpen] = useState(false)
  const moveToRef = useRef<HTMLDivElement>(null)

  const canEditAssignment = user?.role === UserRole.ADMINISTRATOR 
    || user?.role === UserRole.MANAGER 
    || user?.role === UserRole.BUSINESS_ANALYST
  const canEditDetails = user?.role === UserRole.ADMINISTRATOR 
    || user?.role === UserRole.MANAGER
    || user?.role === UserRole.BUSINESS_ANALYST
  const canMoveTo = user?.role === UserRole.ADMINISTRATOR
    || user?.role === UserRole.MANAGER
    || user?.role === UserRole.BUSINESS_ANALYST

  const { data, isLoading } = useQuery({
    queryKey: ['work-item', itemId],
    queryFn: () => apiGet<any>(`/api/work-items/${itemId}`),
    enabled: !!itemId,
  })

  const item = data?.data

  // Close dropdown on outside click
  useEffect(() => {
    if (!moveToOpen) return
    const handler = (e: MouseEvent) => {
      if (!moveToRef.current?.contains(e.target as Node)) setMoveToOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [moveToOpen])

  const moveToMutation = useMutation({
    mutationFn: (status: string) => apiPatch(`/api/work-items/${itemId}/status`, { status }),
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ['work-item', itemId] })
      queryClient.invalidateQueries({ queryKey: ['work-items'], exact: false })
      toast.success(`Moved to ${STATUS_LABELS[status as WorkflowStatus]}`)
      setMoveToOpen(false)
    },
    onError: () => toast.error('Failed to move status'),
  })

  // All workflow statuses in order
  const ALL_STATUSES: WorkflowStatus[] = [
    WorkflowStatus.IN_PIPELINE,
    WorkflowStatus.ASSESSMENT,
    WorkflowStatus.DEVELOPMENT,
    WorkflowStatus.UAT,
    WorkflowStatus.DEPLOYMENT,
    WorkflowStatus.GO_LIVE,
    WorkflowStatus.DROP,
  ]

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
                  <Link href={`/timeline/${item.id}`} className="p-1 rounded text-muted-foreground hover:text-primary transition-colors flex-shrink-0" title="View Timeline">
                    <CalendarRange size={14} />
                  </Link>
                </div>
              ) : (
                <div className="h-5 bg-muted rounded w-40 animate-pulse" />
              )}

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Move To Button */}
                {item && canMoveTo && (
                  <div className="relative" ref={moveToRef}>
                    <button
                      onClick={() => setMoveToOpen(!moveToOpen)}
                      disabled={moveToMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {moveToMutation.isPending ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <ArrowRight size={12} />
                      )}
                      Move to
                      <ChevronDown size={11} className={cn('transition-transform', moveToOpen && 'rotate-180')} />
                    </button>

                    <AnimatePresence>
                      {moveToOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.97 }}
                          transition={{ duration: 0.12 }}
                          className="absolute right-0 top-full mt-1.5 w-48 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden py-1"
                        >
                          {ALL_STATUSES.filter(s => s !== item.status).map(status => (
                            <button
                              key={status}
                              onClick={() => moveToMutation.mutate(status)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
                            >
                              <span className={cn('w-2 h-2 rounded-full flex-shrink-0', {
                                'bg-slate-400': status === WorkflowStatus.IN_PIPELINE,
                                'bg-blue-500': status === WorkflowStatus.ASSESSMENT,
                                'bg-violet-500': status === WorkflowStatus.DEVELOPMENT,
                                'bg-amber-500': status === WorkflowStatus.UAT,
                                'bg-orange-500': status === WorkflowStatus.DEPLOYMENT,
                                'bg-green-500': status === WorkflowStatus.GO_LIVE,
                                'bg-red-500': status === WorkflowStatus.DROP,
                              })} />
                              {STATUS_LABELS[status]}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <X size={16} />
                </button>
              </div>
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
                    {/* Timeline shortcut */}
                    <Link
                      href={`/timeline/${item.id}`}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-primary/30 bg-primary/5 text-primary text-sm font-medium hover:bg-primary/10 transition-colors"
                    >
                      <CalendarRange size={15} />
                      View / Edit Timeline
                    </Link>
                  </div>

                  {/* Info grid */}
                  <div className="px-5 py-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Details</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <EditableDetailField
                        workItemId={item.id}
                        field="priority"
                        label="Priority"
                        currentValue={item.priority}
                        canEdit={canEditDetails}
                      />
                      <EditableDetailField
                        workItemId={item.id}
                        field="dueDate"
                        label="Due Date"
                        currentValue={item.dueDate}
                        canEdit={canEditDetails}
                        type="date"
                      />
                      <EditableDetailField
                        workItemId={item.id}
                        field="departmentId"
                        label="Department"
                        currentValue={item.departmentId}
                        displayValue={item.department?.name}
                        canEdit={canEditDetails}
                      />
                      {item.branch && <InfoRow label="Branch" value={item.branch.name} />}
                      <InfoRow label="Requester" value={item.requesterName} />
                      <InfoRow label="Email" value={item.requesterEmail} />
                      <EditableDetailField
                        workItemId={item.id}
                        field="createdAt"
                        label="Created"
                        currentValue={item.createdAt}
                        canEdit={canEditDetails}
                        type="date"
                      />
                      {item.goLiveDate && <InfoRow label="Go-Live" value={formatDate(item.goLiveDate)} />}
                    </div>
                  </div>

                  {/* Team */}
                  <div className="px-5 py-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Team</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <AssignSelect workItemId={item.id} label="Manager" field="managerId" currentUser={item.manager} canEdit={canEditAssignment} />
                      <MultiSelectBA
                        workItemId={item.id}
                        assignedBAs={item.businessAnalysts ?? (item.businessAnalyst ? [item.businessAnalyst] : [])}
                        canEdit={canEditAssignment}
                      />
                      <EditableDetailField
                        workItemId={item.id}
                        field="vendorId"
                        label="Platform / Vendor"
                        currentValue={item.vendorId}
                        displayValue={item.vendor?.name}
                        canEdit={canEditDetails}
                      />
                      <MandaysEdit 
                        workItemId={item.id} 
                        currentValue={item.mandaysNegotiation?.mandaysApproved ?? item.mandays} 
                        canEdit={canEditAssignment} 
                      />
                    </div>
                  </div>

                  {/* Attachments */}
                  <div className="px-5 py-4 space-y-3 border-b border-border">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Paperclip size={14} className="text-muted-foreground" />
                      Attachments {item.attachments?.length > 0 && `(${item.attachments.length})`}
                    </h3>
                    
                    {item.attachments?.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {item.attachments.map((att: any) => (
                          <div key={att.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card">
                            <FileText size={14} className="text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{att.fileName}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : ''}</span>
                                {att.createdAt && <span>· {formatDate(att.createdAt)}</span>}
                                {att.uploader?.name && <span>· {att.uploader.name}</span>}
                              </div>
                            </div>
                            <a
                              href={`/api/work-items/${item.id}/attachments/${att.id}/download`}
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
                    
                    <FileUpload workItemId={item.id} />
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
                    <ActivityTimeline 
                      logs={item.activityLogs ?? []}
                      currentStatus={item.status}
                      createdAt={item.createdAt}
                      goLiveDate={item.goLiveDate}
                    />
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
