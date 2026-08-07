'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch } from '@/lib/api'
import { TrendingDown, Edit2, Loader2, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface MandaysNegotiation {
  id: string
  workItemId: string
  mandaysRequested: number
  mandaysNegotiated?: number | null
  mandaysApproved: number
  negotiationStatus: string
  negotiationNotes?: string | null
}

export function MandaysNegotiation({
  workItemId,
  currentMandays,
  canPropose,
}: {
  workItemId: string
  currentMandays?: number | null
  canPropose: boolean
  isRequester?: boolean
}) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [negoMandays, setNegoMandays] = useState('')
  const [negoNotes, setNegoNotes] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['mandays-negotiation', workItemId],
    queryFn: () => apiGet<MandaysNegotiation>(`/api/negotiations/${workItemId}`),
  })

  const negotiation = data?.data

  // Create initial negotiation record (when mandays already set but no nego record)
  const createMutation = useMutation({
    mutationFn: (payload: { mandaysRequested: number; mandaysApproved: number; mandaysNegotiated?: number; negotiationNotes?: string }) =>
      apiPost(`/api/negotiations/${workItemId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mandays-negotiation', workItemId] })
      queryClient.invalidateQueries({ queryKey: ['work-item', workItemId] })
      queryClient.invalidateQueries({ queryKey: ['work-items'], exact: false })
      toast.success('Negotiation saved — Final Approval updated')
      setShowForm(false)
      setNegoMandays('')
      setNegoNotes('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save negotiation'),
  })

  // Update existing negotiation (propose new nego value)
  const proposeMutation = useMutation({
    mutationFn: (payload: { mandaysNegotiated: number; negotiationNotes: string }) =>
      apiPatch(`/api/negotiations/${workItemId}/propose`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mandays-negotiation', workItemId] })
      queryClient.invalidateQueries({ queryKey: ['work-item', workItemId] })
      queryClient.invalidateQueries({ queryKey: ['work-items'], exact: false })
      toast.success('Negotiation saved — Final Approval updated to ' + negoMandays + ' days')
      setShowForm(false)
      setNegoMandays('')
      setNegoNotes('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save negotiation'),
  })

  const isPending = createMutation.isPending || proposeMutation.isPending

  const handleSave = () => {
    const mandays = parseFloat(negoMandays)
    if (!mandays || mandays <= 0) {
      toast.error('Masukkan nilai mandays yang valid')
      return
    }

    if (!negotiation) {
      // No record yet — create with negotiated value as final approved
      const original = currentMandays ?? mandays
      createMutation.mutate({
        mandaysRequested: original,
        mandaysApproved: mandays,
        mandaysNegotiated: mandays !== original ? mandays : undefined,
        negotiationNotes: negoNotes || undefined,
      })
    } else {
      // Record exists — update with new negotiated value (auto-accepts)
      proposeMutation.mutate({
        mandaysNegotiated: mandays,
        negotiationNotes: negoNotes || 'Negotiation updated',
      })
    }
  }

  // Don't show section if no initial mandays set
  if (!currentMandays && !negotiation) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <TrendingDown size={14} className="text-muted-foreground" />
          Mandays Negotiation
        </h3>
        <p className="text-xs text-muted-foreground italic">
          Input mandays awal terlebih dahulu untuk membuka fitur negosiasi.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 size={14} className="animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  const saved = negotiation ? negotiation.mandaysRequested - negotiation.mandaysApproved : 0
  const hasNego = negotiation && negotiation.mandaysNegotiated != null

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <TrendingDown size={14} className="text-muted-foreground" />
          Mandays Negotiation
        </h3>
        {canPropose && !showForm && (
          <button
            onClick={() => {
              setShowForm(true)
              setNegoMandays(negotiation?.mandaysApproved?.toString() || currentMandays?.toString() || '')
            }}
            className="text-xs text-primary hover:text-primary/80 transition-colors font-medium flex items-center gap-1"
          >
            <Edit2 size={12} /> {negotiation ? 'Update Nego' : 'Input Nego'}
          </button>
        )}
      </div>

      {/* Summary rows */}
      <div className="rounded-lg border border-border bg-background divide-y divide-border text-sm">
        <div className="flex justify-between px-3 py-2">
          <span className="text-muted-foreground">Requested</span>
          <span className="font-medium text-foreground">
            {negotiation ? negotiation.mandaysRequested : currentMandays} days
          </span>
        </div>

        {hasNego && (
          <div className="flex justify-between px-3 py-2">
            <span className="text-muted-foreground">Negotiated</span>
            <span className={cn(
              'font-medium',
              negotiation!.mandaysNegotiated! < negotiation!.mandaysRequested
                ? 'text-amber-600'
                : 'text-foreground'
            )}>
              {negotiation!.mandaysNegotiated} days
              {negotiation!.mandaysNegotiated! < negotiation!.mandaysRequested && (
                <span className="text-xs ml-1 text-muted-foreground">
                  (↓ {negotiation!.mandaysRequested - negotiation!.mandaysNegotiated!} days)
                </span>
              )}
            </span>
          </div>
        )}

        <div className="flex justify-between px-3 py-2 bg-primary/5">
          <span className="font-semibold text-foreground">Final Approved</span>
          <span className={cn(
            'font-bold',
            saved > 0 ? 'text-green-600' : 'text-foreground'
          )}>
            {negotiation ? negotiation.mandaysApproved : (currentMandays ?? '—')} days
            {saved > 0 && (
              <span className="ml-1.5 text-xs font-normal text-green-600">
                (hemat {saved} hari)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Notes */}
      {negotiation?.negotiationNotes && (
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {showHistory ? 'Sembunyikan catatan' : 'Lihat catatan negosiasi'}
        </button>
      )}
      {showHistory && negotiation?.negotiationNotes && (
        <div className="p-2.5 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground">
          {negotiation.negotiationNotes}
        </div>
      )}

      {/* Input form */}
      {showForm && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2.5">
          <p className="text-xs font-medium text-foreground">
            Input hasil negosiasi mandays (final approved)
          </p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={negoMandays}
                onChange={(e) => setNegoMandays(e.target.value)}
                placeholder="e.g. 15"
                className="input py-1.5 text-sm w-full"
                disabled={isPending}
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">days</span>
            </div>
            <button
              onClick={handleSave}
              disabled={isPending || !negoMandays}
              className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors flex-shrink-0"
              title="Simpan"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button
              onClick={() => { setShowForm(false); setNegoMandays(''); setNegoNotes('') }}
              disabled={isPending}
              className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors flex-shrink-0"
              title="Batal"
            >
              <X size={14} />
            </button>
          </div>
          <input
            type="text"
            value={negoNotes}
            onChange={(e) => setNegoNotes(e.target.value)}
            placeholder="Catatan (opsional)"
            className="input py-1.5 text-xs w-full"
            disabled={isPending}
          />
          <p className="text-[11px] text-muted-foreground">
            Nilai ini akan langsung menjadi <strong>Final Approved</strong> dan update field Mandays di drawer.
          </p>
        </div>
      )}
    </div>
  )
}
