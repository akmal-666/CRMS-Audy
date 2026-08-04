'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'

const LineChart = dynamic(() => import('recharts').then(m => ({ default: m.LineChart })), { ssr: false })
const Line = dynamic(() => import('recharts').then(m => ({ default: m.Line })), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => ({ default: m.XAxis })), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => ({ default: m.YAxis })), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(m => ({ default: m.CartesianGrid })), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => ({ default: m.Tooltip })), { ssr: false })
const Legend = dynamic(() => import('recharts').then(m => ({ default: m.Legend })), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })), { ssr: false })

interface TrendChartProps {
  data: any[]
  isLoading: boolean
  filterType?: 'year' | 'quarter' | 'month' | 'custom'
}

type ViewMode = 'monthly' | 'quarterly' | 'yearly'

export function TrendChart({ data, isLoading, filterType }: TrendChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('monthly')

  const aggregatedData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    if (filterType === 'month') {
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4']
      const totalCreated = data.reduce((sum, item) => sum + (item.created || 0), 0)
      const totalCompleted = data.reduce((sum, item) => sum + (item.completed || 0), 0)
      
      return weeks.map(() => ({
        month: `Week ${Math.floor(Math.random() * 4) + 1}`,
        created: Math.floor(totalCreated / 4),
        completed: Math.floor(totalCompleted / 4),
      }))
    }
    
    return data
  }, [data, filterType])

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
      className="card h-auto sm:h-[400px]"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Created vs Completed Trend</h3>
        <select 
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as ViewMode)}
          className="text-[11px] sm:text-xs border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
      
      {!aggregatedData || aggregatedData.length === 0 ? (
        <div className="flex items-center justify-center h-[250px] sm:h-[320px] text-muted-foreground text-sm">
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280} className="sm:hidden">
          <LineChart data={aggregatedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              stroke="#9ca3af"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6b7280' }}
              stroke="#9ca3af"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '11px',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px' }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="created"
              name="Created"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="completed"
              name="Completed"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
      
      {aggregatedData && aggregatedData.length > 0 && (
        <ResponsiveContainer width="100%" height={320} className="hidden sm:block">
          <LineChart data={aggregatedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              stroke="#9ca3af"
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              stroke="#9ca3af"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="created"
              name="Created"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="completed"
              name="Completed"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  )
}
