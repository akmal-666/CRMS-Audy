'use client'

import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'

interface MandaysDeviationChartProps {
  data: any
  isLoading: boolean
}

export function MandaysDeviationChart({ data, isLoading }: MandaysDeviationChartProps) {
  if (isLoading) {
    return (
      <div className="card h-[220px] animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  const within10 = data?.within10Percent || 0
  const within20 = data?.within20Percent || 0
  const over20 = data?.over20Percent || 0
  const total = data?.total || 0

  const chartData = [
    { label: 'Within ±10%', value: within10, fill: '#10b981' },
    { label: '10–20% deviation', value: within20, fill: '#f59e0b' },
    { label: '>20% deviation', value: over20, fill: '#ef4444' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">Mandays Deviation Analysis</h3>
      
      {total === 0 ? (
        <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
          No deviation data available
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Chart */}
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 120, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                stroke="#9ca3af"
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                stroke="#9ca3af"
                width={115}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: any) => [`${value} projects`, 'Count']}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={32}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <CheckCircle2 size={20} className="text-green-600 mb-2" />
              <span className="text-2xl font-bold text-green-600">{within10}</span>
              <span className="text-xs text-center text-muted-foreground mt-1">Within ±10%</span>
              {total > 0 && (
                <span className="text-xs text-green-600 font-medium">{Math.round((within10/total)*100)}%</span>
              )}
            </div>
            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <AlertTriangle size={20} className="text-amber-600 mb-2" />
              <span className="text-2xl font-bold text-amber-600">{within20}</span>
              <span className="text-xs text-center text-muted-foreground mt-1">10–20% Dev.</span>
              {total > 0 && (
                <span className="text-xs text-amber-600 font-medium">{Math.round((within20/total)*100)}%</span>
              )}
            </div>
            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle size={20} className="text-red-600 mb-2" />
              <span className="text-2xl font-bold text-red-600">{over20}</span>
              <span className="text-xs text-center text-muted-foreground mt-1">&gt;20% Dev.</span>
              {total > 0 && (
                <span className="text-xs text-red-600 font-medium">{Math.round((over20/total)*100)}%</span>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
