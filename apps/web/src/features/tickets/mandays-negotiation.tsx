'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch } from '@/lib/api'
import { UserRole } from '@crms/types'
import { useAuth } from '@/context/auth-context'
import { 
  TrendingDown, Check, X, Edit2, AlertCircle, CheckCircle, 
  XCircle, Clock, Loader2, DollarSign 
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface MandaysNegotiation {
  id: string
  workItemId: string
  mandaysRequested: number
  mandaysNegotiated?: number | null
  mandaysApproved: number
  negotiationStatus: 'none' | 'proposed' | 'accepted' | 'rejected' | 'pending'
  negotiationNotes?: string | null
  rejectionReason?: string | null
  negotiatedBy?: string | null
  negotiatedAt?: string | null
  respondedBy?: string | null
  respondedAt?: string | null
  negotiator?: { id: string; name: string; email: string } | null
  responder?: { id: string; name: string; email: string } | null
}

const STATUS_CONFIG = {
  none: {
    label: 'No negotiation',
    icon: CheckCircle,
    color: 'text-muted-foreground',
    bg: 'bg-muted/50',
  },
  proposed: {
    label: 'Proposal pending',
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-100 dark:bg-amber-950',
  },
  accepted: {
    label: 'Negotiation successful',
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-100 dark:bg-green-950',
  },
  rejected: {
    label: 'Proposal rejected',
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-100 dark:bg-red-950',
  },
  pending: {
    label: 'Pending approval',
    icon: Clock,
    color: 'text-blue-600',
    bg: 'bg-blue-100 dark:bg-blue-950',
  },
}

export function MandaysNegotiation({
  workItemId,
  currentMandays,
  canPropose,
  isRequester,
}: {
  workItemId: string
  currentMandays?: number | null
  canPropose: boolean
  isRequester: boolean
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showProposeForm, setShowProposeForm] = useState(false)
  const [proposeMandays, setProposeMandays] = useState('')
  const [proposeNotes, setProposeNotes] = useState('')
  const [showRespondForm, setShowRespondForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['mandays-negotiation', workItemId],
    queryFn: () => apiGet<MandaysNegotiation>(`/api/negotiations/${workItemId}`),
  })

  const negotiation = data?.data

  const proposeMutation = useMutation({
    mutationFn: (payload: { mandaysNegotiated: number; negotiationNotes: string }) =>
      apiPatch(`/api/negotiations/${workItemId}/propose`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mandays-negotiation', workItemId] })
      queryClient.invalidateQueries({ queryKey: ['work-item', workItemId] })
      toast.success('Negotiation proposal submitted')
      setShowProposeForm(false)
      setProposeMandays('')
      setProposeNotes('')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to submit proposal')
    },
  })

  const respondMutation = useMutation({
    mutationFn: (payload: { action: 'accept' | 'reject'; rejectionReason?: string }) =>
      apiPatch(`/api/negotiations/${workItemId}/respond`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mandays-negotiation', workItemId] })
      queryClient.invalidateQueries({ queryKey: ['work-item', workItemId] })
      queryClient.invalidateQueries({ queryKey: ['work-items'] })
      toast.success('Response submitted')
      setShowRespondForm(false)
      setRejectReason('')
    },
    onError: () => {
      toast.error('Failed to submit response')
    },
  })

  const handlePropose = () => {
    const mandays = parseFloat(proposeMandays)
    if (!mandays || mandays <= 0) {
      toast.error('Please enter valid mandays')
      return
    }
    if (!proposeNotes.trim()) {
      toast.error('Please provide negotiation notes')
      return
    }
    proposeMutation.mutate({ mandaysNegotiated: mandays, negotiationNotes: proposeNotes })
  }

  const handleAccept = () => {
    respondMutation.mutate({ action: 'accept' })
  }

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide rejection reason')
      return
    }
    respondMutation.mutate({ action: 'reject', rejectionReason: rejectReason })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={16} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!negotiation) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <TrendingDown size={14} className="text-muted-foreground" />
          Mandays Negotiation
        </h3>
        <p className="text-sm text-muted-foreground italic">
          No negotiation record yet
        </p>
      </div>
    )
  }

  const StatusIcon = STATUS_CONFIG[negotiation.negotiationStatus].icon
  const saved = negotiation.mandaysRequested - negotiation.mandaysApproved
  const savingsPercentage = negotiation.mandaysRequested > 0
    ? ((saved / negotiation.mandaysRequested) * 100).toFixed(1)
    : 0

  const canRespond = isRequester && negotiation.negotiationStatus === 'proposed'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <TrendingDown size={14} className="text-muted-foreground" />
          Mandays Negotiation
        </h3>
        {canPropose && negotiation.negotiationStatus !== 'proposed' && !showProposeForm && (
          <button
            onClick={() => setShowProposeForm(true)}
            className="text-xs text-primary hover:text-primary/80 transition-colors font-medium flex items-center gap-1"
          >
            <Edit2 size={12} /> Propose
          </button>
        )}
      </div>

      {/* Status badge */}
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
          STATUS_CONFIG[negotiation.negotiationStatus].bg,
          STATUS_CONFIG[negotiation.negotiationStatus].color
        )}
      >
        <StatusIcon size={12} />
        {STATUS_CONFIG[negotiation.negotiationStatus].label}
      </div>

      {/* Mandays breakdown */}
      <div className="space-y-2 p-3 border border-border rounded-lg bg-background">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Requested:</span>
          <span className={cn(
            "font-semibold",
            negotiation.negotiationStatus === 'accepted' && negotiation.mandaysRequested !== negotiation.mandaysApproved
              ? "line-through text-muted-foreground"
              : "text-foreground"
          )}>
            {negotiation.mandaysRequested} days
          </span>
        </div>

        {negotiation.mandaysNegotiated && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Negotiated:</span>
            <span className="font-semibold text-amber-600">
              {negotiation.mandaysNegotiated} days
              {negotiation.mandaysNegotiated < negotiation.mandaysRequested && (
                <span className="text-xs ml-1">
                  (↓ {negotiation.mandaysRequested - negotiation.mandaysNegotiated} days)
                </span>
              )}
            </span>
          </div>
        )}

        <div className="flex justify-between text-sm pt-2 border-t border-border">
          <span className="text-muted-foreground">Final Approved:</span>
          <span className="font-bold text-foreground">
            {negotiation.mandaysApproved} days
          </span>
        </div>

        {saved > 0 && negotiation.negotiationStatus === 'accepted' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="pt-2 border-t border-border"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-green-600">
              <CheckCircle size={14} />
              <span>Saved {saved} days ({savingsPercentage}%)</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Negotiation notes */}
      {negotiation.negotiationNotes && (
        <div className="p-3 border border-border rounded-lg bg-muted/20">
          <p className="text-xs font-semibold text-muted-foreground mb-1">
            Negotiation Reason:
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            {negotiation.negotiationNotes}
          </p>
          {negotiation.negotiator && (
            <p className="text-xs text-muted-foreground mt-2">
              Proposed by {negotiation.negotiator.name} on{' '}
              {negotiation.negotiatedAt && formatDate(negotiation.negotiatedAt)}
            </p>
          )}
        </div>
      )}

      {/* Rejection reason */}
      {negotiation.rejectionReason && (
        <div className="p-3 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950/20">
          <p className="text-xs font-semibold text-red-600 mb-1 flex items-center gap-1">
            <XCircle size={12} />
            Rejection Reason:
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            {negotiation.rejectionReason}
          </p>
        </div>
      )}

      {/* Inline Propose form */}
      {canPropose && negotiation.negotiationStatus !== 'proposed' && (
        <div className="space-y-2">
          {!showProposeForm ? (
            <button
              onClick={() => setShowProposeForm(true)}
              className="text-xs text-primary hover:text-primary/80 transition-colors font-medium flex items-center gap-1"
            >
              <Edit2 size={12} /> Add Negotiation
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={proposeMandays}
                  onChange={(e) => setProposeMandays(e.target.value)}
                  placeholder="Mandays"
                  className="flex-1 px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  disabled={proposeMutation.isPending}
                />
                <button
                  onClick={handlePropose}
                  disabled={proposeMutation.isPending || !proposeMandays || !proposeNotes}
                  className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Save"
                >
                  {proposeMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowProposeForm(false)
                    setProposeMandays('')
                    setProposeNotes('')
                  }}
                  disabled={proposeMutation.isPending}
                  className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
                  title="Cancel"
                >
                  <X size={14} />
                </button>
              </div>
              <textarea
                value={proposeNotes}
                onChange={(e) => setProposeNotes(e.target.value)}
                placeholder="Reason for negotiation..."
                rows={2}
                className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                disabled={proposeMutation.isPending}
              />
            </>
          )}
        </div>
      )}

      {/* Respond to proposal (Requester only) */}
      {canRespond && !showRespondForm && (
        <div className="p-3 border border-amber-200 dark:border-amber-900 rounded-lg bg-amber-50 dark:bg-amber-950/20 space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                Proposal Received
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                The BA/Manager has proposed a different mandays estimate. Please review and respond.
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAccept}
              disabled={respondMutation.isPending}
              className="flex-1 btn-primary text-xs py-1.5 flex items-center justify-center gap-1"
            >
              {respondMutation.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Check size={12} />
              )}
              Accept
            </button>
            <button
              onClick={() => setShowRespondForm(true)}
              disabled={respondMutation.isPending}
              className="flex-1 px-3 py-1.5 text-xs border border-red-300 dark:border-red-800 rounded-lg bg-background hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 font-medium transition-colors"
            >
              <X size={12} className="inline mr-1" />
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Reject form */}
      <AnimatePresence>
        {showRespondForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950/20 space-y-2"
          >
            <div>
              <label className="text-xs font-medium text-red-700 dark:text-red-400 block mb-1">
                Rejection Reason
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please explain why you're rejecting this proposal..."
                rows={2}
                className="w-full px-3 py-1.5 text-sm border border-red-300 dark:border-red-800 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none"
                disabled={respondMutation.isPending}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                disabled={respondMutation.isPending}
                className="flex-1 px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1"
              >
                {respondMutation.isPending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <X size={12} />
                )}
                Submit Rejection
              </button>
              <button
                onClick={() => {
                  setShowRespondForm(false)
                  setRejectReason('')
                }}
                disabled={respondMutation.isPending}
                className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
