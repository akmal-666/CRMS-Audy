'use client'

import { motion } from 'framer-motion'
import { PlusCircle } from 'lucide-react'

interface TopupsHistoryTableProps {
  data: any[]
  isLoading: boolean
}

export function TopupsHistoryTable({ data, isLoading }: TopupsHistoryTableProps) {
  if (isLoading) {
    return (
      <div className="card h-[300px] animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  const formatDate = (date: any) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PlusCircle size={16} className="text-amber-500" />
          <h3 className="text-sm font-semibold text-foreground">Mandays Top-up History</h3>
        </div>
        <span className="text-xs text-muted-foreground">{data?.length || 0} records</span>
      </div>

      {!data || data.length === 0 ? (
        <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
          No top-up records yet. Click "Add Top-up" to add mandays allocation.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="text-left p-2 font-medium text-muted-foreground">Date</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Vendor / Platform</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Mandays Added</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Notes</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Added By</th>
              </tr>
            </thead>
            <tbody>
              {data.map((topup, index) => (
                <motion.tr
                  key={topup.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="border-b hover:bg-muted/30 transition-colors"
                >
                  <td className="p-2 text-muted-foreground whitespace-nowrap">
                    {formatDate(topup.createdAt)}
                  </td>
                  <td className="p-2">
                    <span className="font-medium text-foreground">{topup.vendor}</span>
                  </td>
                  <td className="p-2 text-right">
                    <span className="font-semibold text-amber-600">+{topup.mandays} MD</span>
                  </td>
                  <td className="p-2 text-muted-foreground max-w-[300px]">
                    <span className="truncate block">{topup.notes || '—'}</span>
                  </td>
                  <td className="p-2 text-muted-foreground">{topup.createdBy}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  )
}
