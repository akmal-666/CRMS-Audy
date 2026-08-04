'use client'

import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useMemo } from 'react'

const PieChart = dynamic(() => import('recharts').then(m => ({ default: m.PieChart })), { ssr: false })
const Pie = dynamic(() => import('recharts').then(m => ({ default: m.Pie })), { ssr: false })
const Cell = dynamic(() => import('recharts').then(m => ({ default: m.Cell })), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => ({ default: m.Tooltip })), { ssr: false })

interface StatusChartProps {
  data: any[]
  isLoading: boolean
  total: number
}

const STATUS_COLORS: Record<string, string> = {
  in_pipeline: '#3b82f6',
  assessment: '#f59e0b',
  development: '#8b5cf6',
  uat: '#ec4899',
  deployment: '#14b8a6',
  go_live: '#10b981',
  drop: '#ef4444',
  on_hold: '#6b7280',
}

const STATUS_LABELS: Record<string, string> = {
  in_pipeline: 'In Pipeline',
  assessment: 'Assessment',
  development: 'Development',
  uat: 'UAT / Testing',
  deployment: 'Deployment',
  go_live: 'Completed',
  drop: 'Cancelled',
  on_hold: 'On Hold',
}

export function StatusChart({ data, isLoading, total }: StatusChartProps) {
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return []
    return data.map(item => ({
      name: STATUS_LABELS[item.status] || item.status,
      value: item.count,
      percentage: item.percentage,
      fill: STATUS_COLORS[item.status] || '#6b7280',
    }))
  }, [data])

  if (isLoading) {
    return (
      <div className="card h-[400px] animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card h-[400px]"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">Requests by Status</h3>
      
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[320px] text-muted-foreground text-sm">
          No data available
        </div>
      ) : (
        <>
          <div className="relative">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={false}
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
                  formatter={(value: any, name: any, props: any) => [
                    `${value} (${props.payload.percentage}%)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <div className="text-3xl font-bold text-foreground">{total || 0}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="text-xs text-muted-foreground truncate">
                  {item.name}: <span className="font-medium text-foreground">{item.value}</span> ({item.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  )
}
