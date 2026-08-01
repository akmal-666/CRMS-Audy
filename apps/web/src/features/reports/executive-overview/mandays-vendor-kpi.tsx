'use client'

import { motion } from 'framer-motion'
import { Wallet, TrendingUp, AlertTriangle, CheckCircle2, BarChart3 } from 'lucide-react'

interface MandaysVendorKPIProps {
  data: any[]
  summary: any
  isLoading: boolean
}

export function MandaysVendorKPI({ data, summary, isLoading }: MandaysVendorKPIProps) {
  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-48 bg-muted rounded" />
      </div>
    )
  }

  const vendors = data || []
  const totalPlanned = summary?.totalPlanned || 0
  const totalUsed = summary?.totalUsed || 0
  const totalRemaining = summary?.totalRemaining || 0
  const usedPct = totalPlanned + (summary?.totalTopup || 0) > 0
    ? Math.round((totalUsed / (totalPlanned + (summary?.totalTopup || 0))) * 100)
    : 0

  const fmt = (v: number) => v % 1 === 0 ? v.toString() : v.toFixed(1)

  const getBarColor = (pct: number) => {
    if (pct >= 90) return 'bg-red-500'
    if (pct >= 70) return 'bg-amber-500'
    return 'bg-blue-500'
  }

  const getRemainingColor = (remaining: number, total: number) => {
    if (total === 0) return 'text-muted-foreground'
    const pct = (remaining / total) * 100
    if (remaining <= 0) return 'text-red-600'
    if (pct <= 20) return 'text-red-600'
    if (pct <= 40) return 'text-amber-600'
    return 'text-green-600'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <Wallet size={16} className="text-blue-600" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Mandays Used per Platform / Vendor</h3>
        </div>

        {/* Summary totals */}
        <div className="hidden md:flex items-center gap-6 text-xs">
          <div className="text-center">
            <div className="font-bold text-foreground">{fmt(totalPlanned)} MD</div>
            <div className="text-muted-foreground">Planned</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-blue-600">{fmt(totalUsed)} MD</div>
            <div className="text-muted-foreground">Used</div>
          </div>
          <div className="text-center">
            <div className={`font-bold ${totalRemaining <= 0 ? 'text-red-600' : totalRemaining < 20 ? 'text-amber-600' : 'text-green-600'}`}>
              {fmt(totalRemaining)} MD
            </div>
            <div className="text-muted-foreground">Remaining</div>
          </div>
          <div className="text-center">
            <div className={`font-bold ${usedPct >= 90 ? 'text-red-600' : usedPct >= 70 ? 'text-amber-600' : 'text-blue-600'}`}>
              {usedPct}%
            </div>
            <div className="text-muted-foreground">Utilization</div>
          </div>
        </div>
      </div>

      {vendors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <BarChart3 size={28} className="mb-2 opacity-30" />
          <p className="text-sm">No mandays data available</p>
          <p className="text-xs mt-1 text-center">Add mandays in CR assessment form to see usage here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vendors.map((vendor, index) => {
            const usedPct = vendor.total > 0 ? Math.min((vendor.used / vendor.total) * 100, 100) : 0
            const remainingColor = getRemainingColor(vendor.remaining, vendor.total)

            return (
              <motion.div
                key={vendor.vendorId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
                className="group"
              >
                {/* Row: vendor name + numbers */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Status dot */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      vendor.remaining <= 0 ? 'bg-red-500' :
                      vendor.utilizationPercent >= 90 ? 'bg-red-500' :
                      vendor.utilizationPercent >= 70 ? 'bg-amber-500' :
                      'bg-green-500'
                    }`} />
                    <span className="text-xs font-medium text-foreground truncate">{vendor.vendorName}</span>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {vendor.projectCount} CR{vendor.projectCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Numbers */}
                  <div className="flex items-center gap-4 flex-shrink-0 ml-2">
                    <div className="text-right hidden sm:block">
                      <span className="text-xs text-muted-foreground">{fmt(vendor.used)}</span>
                      <span className="text-[10px] text-muted-foreground"> / {fmt(vendor.total)} MD</span>
                    </div>
                    <div className="text-right w-16">
                      <span className={`text-xs font-semibold ${remainingColor}`}>
                        {vendor.remaining <= 0 ? '0' : fmt(vendor.remaining)} MD left
                      </span>
                    </div>
                    <div className="text-right w-10">
                      <span className={`text-xs font-bold ${
                        vendor.utilizationPercent >= 90 ? 'text-red-600' :
                        vendor.utilizationPercent >= 70 ? 'text-amber-600' :
                        'text-blue-600'
                      }`}>
                        {vendor.utilizationPercent}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${usedPct}%` }}
                    transition={{ duration: 0.7, delay: index * 0.04 }}
                    className={`h-full rounded-full ${getBarColor(vendor.utilizationPercent)}`}
                  />
                </div>

                {/* Breakdown: Planned / Topup / Used */}
                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                  <span>Planned: <span className="text-foreground font-medium">{fmt(vendor.planned)}</span></span>
                  {vendor.topup > 0 && (
                    <span className="text-amber-600">+{fmt(vendor.topup)} top-up</span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      {vendors.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /><span>Normal (&lt;70%)</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /><span>High (70–90%)</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /><span>Critical (&gt;90%)</span></div>
        </div>
      )}
    </motion.div>
  )
}
