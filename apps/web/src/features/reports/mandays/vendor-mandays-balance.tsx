'use client'

import { motion } from 'framer-motion'
import { Wallet, TrendingDown, AlertTriangle, CheckCircle2, PlusCircle } from 'lucide-react'

interface VendorMandaysBalanceProps {
  data: any[]
  isLoading: boolean
  onTopup?: () => void
}

export function VendorMandaysBalance({ data, isLoading, onTopup }: VendorMandaysBalanceProps) {
  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-48 bg-muted rounded" />
      </div>
    )
  }

  const vendors = data || []

  const getStatusConfig = (remaining: number, total: number) => {
    if (total === 0) return { color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', bar: 'bg-gray-400', label: 'No Allocation', icon: Wallet }
    const pct = total > 0 ? (remaining / total) * 100 : 0
    if (remaining <= 0) return { color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', bar: 'bg-red-500', label: 'Depleted', icon: AlertTriangle }
    if (pct <= 20) return { color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', bar: 'bg-red-500', label: 'Critical', icon: AlertTriangle }
    if (pct <= 40) return { color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', bar: 'bg-amber-500', label: 'Low', icon: TrendingDown }
    if (pct <= 70) return { color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', bar: 'bg-blue-500', label: 'Normal', icon: CheckCircle2 }
    return { color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', bar: 'bg-green-500', label: 'Healthy', icon: CheckCircle2 }
  }

  const formatMD = (v: number) => {
    if (v === 0) return '0'
    return v % 1 === 0 ? v.toString() : v.toFixed(1)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <Wallet size={18} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Mandays Balance per Vendor</h3>
            <p className="text-xs text-muted-foreground">Remaining = Allocated (Planned + Top-up) − Used</p>
          </div>
        </div>
        {onTopup && (
          <button
            onClick={onTopup}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5"
          >
            <PlusCircle size={13} />
            Add Top-up
          </button>
        )}
      </div>

      {vendors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Wallet size={32} className="mb-3 opacity-30" />
          <p className="text-sm">No vendor mandays data available</p>
          <p className="text-xs mt-1">Add mandays to CR assessments or submit a top-up</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {vendors.map((vendor, index) => {
            const cfg = getStatusConfig(vendor.remaining, vendor.total)
            const usedPct = vendor.total > 0 ? Math.min((vendor.used / vendor.total) * 100, 100) : 0
            const remainingPct = vendor.total > 0 ? Math.max((vendor.remaining / vendor.total) * 100, 0) : 0
            const StatusIcon = cfg.icon

            return (
              <motion.div
                key={vendor.vendorId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-xl border p-4 ${cfg.bg} border-opacity-30`}
              >
                {/* Vendor name + status badge */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{vendor.vendorName}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <StatusIcon size={11} className={cfg.color} />
                      <span className={`text-[11px] font-medium ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  </div>
                  {/* Remaining badge - big and prominent */}
                  <div className={`text-right`}>
                    <div className={`text-2xl font-bold ${vendor.remaining <= 0 ? 'text-red-600' : 'text-foreground'}`}>
                      {formatMD(vendor.remaining)}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-medium">MD remaining</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Used: {formatMD(vendor.used)} MD</span>
                    <span>{Math.round(usedPct)}% used</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${usedPct}%` }}
                      transition={{ duration: 0.8, delay: index * 0.05 }}
                      className={`h-full rounded-full ${cfg.bar}`}
                    />
                  </div>
                </div>

                {/* Breakdown row */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-black/5 dark:border-white/10">
                  <div className="text-center">
                    <div className="text-[11px] font-semibold text-blue-600">{formatMD(vendor.planned)}</div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Planned</div>
                  </div>
                  <div className="text-center border-x border-black/5 dark:border-white/10">
                    <div className="text-[11px] font-semibold text-amber-600">+{formatMD(vendor.topup)}</div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Top-up</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[11px] font-semibold text-foreground">{formatMD(vendor.total)}</div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Total</div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      {vendors.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t text-[11px] text-muted-foreground">
          <span className="font-medium">Status:</span>
          {[
            { color: 'bg-green-500', label: 'Healthy (>70%)' },
            { color: 'bg-blue-500', label: 'Normal (40–70%)' },
            { color: 'bg-amber-500', label: 'Low (20–40%)' },
            { color: 'bg-red-500', label: 'Critical (≤20%)' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
