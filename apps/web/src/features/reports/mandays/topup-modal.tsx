'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, PlusCircle, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api'

interface TopupModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface Vendor {
  id: string
  name: string
  code: string
}

export function TopupModal({ isOpen, onClose, onSuccess }: TopupModalProps) {
  const [vendorId, setVendorId] = useState('')
  const [mandays, setMandays] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Use React Query to fetch vendors - consistent with other components
  const { data: vendorsData, isLoading: isLoadingVendors } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: () => apiGet<Vendor[]>('/api/master-data/vendors'),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  })

  // vendors is inside res.data (ApiResponse<Vendor[]> -> .data is Vendor[])
  const vendors: Vendor[] = vendorsData?.data || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!vendorId) return setError('Please select a vendor / platform.')
    const mandaysNum = parseFloat(mandays)
    if (!mandays || isNaN(mandaysNum) || mandaysNum <= 0) {
      return setError('Mandays must be a positive number.')
    }

    setIsSubmitting(true)
    try {
      await apiPost('/api/reports/mandays/topup', {
        vendorId,
        mandays: mandaysNum,
        notes: notes.trim() || undefined,
      })
      onSuccess()
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to add top-up. Please try again.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setVendorId('')
      setMandays('')
      setNotes('')
      setError('')
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <PlusCircle size={18} className="text-amber-500" />
                <h2 className="text-base font-semibold text-foreground">Add Mandays Top-up</h2>
              </div>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Vendor */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Vendor / Platform <span className="text-red-500">*</span>
                </label>
                {isLoadingVendors ? (
                  <div className="h-9 bg-muted rounded-lg animate-pulse" />
                ) : (
                  <select
                    value={vendorId}
                    onChange={e => setVendorId(e.target.value)}
                    required
                    className="w-full h-9 px-3 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select vendor / platform</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Mandays */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Mandays <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={mandays}
                    onChange={e => setMandays(e.target.value)}
                    min="0.5"
                    step="0.5"
                    placeholder="e.g. 10.5"
                    required
                    className="w-full h-9 pl-3 pr-10 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                    MD
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Decimal values allowed (e.g. 0.5, 1.5, 10.25)</p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Reason for top-up, contract reference, etc."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 h-9 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isLoadingVendors}
                  className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <PlusCircle size={14} />
                      Add Top-up
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
