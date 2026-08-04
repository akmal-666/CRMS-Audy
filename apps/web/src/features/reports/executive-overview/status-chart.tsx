'use client'

import { motion } from 'framer-motion'
import { useMemo, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Dynamic import Recharts with loading fallback
const Recharts = dynamic(() => import('recharts'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-[220px]"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
})

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

function StatusChartContent({ data, total }: { data: any[], total: number }) {
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return []
    console.log('🎨 Chart Data:', data)
    return data.map(item => ({
      name: STATUS_LABELS[item.status] || item.status,
      value: item.count,
      percentage: item.percentage,
      fill: STATUS_COLORS[item.status] || '#6b7280',
    }))
  }, [data])

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
        No data available
      </div>
    )
  }

  return (
    <Recharts>
      {(recharts: any) => {
        const { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } = recharts
        
        return (
          <>
            <div className="relative min-h-[220px] sm:min-h-[260px]">
              {/* Mobile version */}
              <div className="sm:hidden">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
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
              </div>

              {/* Desktop version */}
              <div className="hidden sm:block">
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
              </div>
              
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <div className="text-2xl sm:text-3xl font-bold text-foreground">{total || 0}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">Total</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 mt-3 sm:mt-4">
              {chartData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-[11px] sm:text-xs text-muted-foreground truncate">
                    {item.name}: <span className="font-medium text-foreground">{item.value}</span> ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </>
        )
      }}
    </Recharts>
  )
}

export function StatusChart({ data, isLoading, total }: StatusChartProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (isLoading) {
    return (
      <div className="card h-auto sm:h-[400px] animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  if (!mounted) {
    return (
      <div className="card h-auto sm:h-[400px]">
        <h3 className="text-sm font-semibold text-foreground mb-4">Requests by Status</h3>
        <div className="flex items-center justify-center h-[220px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card h-auto sm:h-[400px]"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">Requests by Status</h3>
      <StatusChartContent data={data} total={total} />
    </motion.div>
  )
}
