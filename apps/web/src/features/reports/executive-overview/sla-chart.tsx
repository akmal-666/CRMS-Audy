'use client'

import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
const PieChart = dynamic(() => import('recharts').then(m => ({ default: m.PieChart })), { ssr: false })
const Pie = dynamic(() => import('recharts').then(m => ({ default: m.Pie })), { ssr: false })
const Cell = dynamic(() => import('recharts').then(m => ({ default: m.Cell })), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => ({ default: m.Tooltip })), { ssr: false })
import { TrendingUp } from 'lucide-react'

interface SLAChartProps {
  data: any
  isLoading: boolean
}

export function SLAChart({ data, isLoading }: SLAChartProps) {
  if (isLoading) {
    return (
      <div className="card h-[360px] animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  const withinSLA = data?.withinSLA || 0
  const overSLA = data?.overSLA || 0
  const percentage = data?.percentage || 0

  const chartData = [
    { name: 'Within SLA', value: withinSLA, fill: '#10b981' },
    { name: 'Over SLA', value: overSLA, fill: '#ef4444' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card h-[360px]"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">SLA Achievement</h3>
      
      {withinSLA === 0 && overSLA === 0 ? (
        <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
          No SLA data available
        </div>
      ) : (
        <>
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center percentage */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-8 text-center">
              <div className="text-4xl font-bold text-green-600">{percentage}%</div>
              <div className="text-xs text-muted-foreground">Within SLA</div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center justify-center gap-1 mb-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <p className="text-xs text-muted-foreground">Within SLA</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{withinSLA}</p>
            </div>

            <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
              <div className="flex items-center justify-center gap-1 mb-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <p className="text-xs text-muted-foreground">Over SLA</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{overSLA}</p>
            </div>
          </div>

          {/* Link to detailed report */}
          <div className="mt-3 text-center">
            <button className="text-xs text-primary hover:underline flex items-center gap-1 mx-auto">
              <span>View detailed report</span>
              <TrendingUp size={12} />
            </button>
          </div>
        </>
      )}
    </motion.div>
  )
}
