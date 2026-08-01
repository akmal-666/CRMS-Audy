'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface TrendChartProps {
  data: any[]
  isLoading: boolean
  filterType?: 'year' | 'quarter' | 'month' | 'custom'
}

type ViewMode = 'monthly' | 'quarterly' | 'yearly'

export function TrendChart({ data, isLoading, filterType }: TrendChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('monthly')

  if (isLoading) {
    return (
      <div className="card h-[400px] animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  // Transform data based on filter type - if Month selected, show weeks
  const aggregatedData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    // If filter is "month", transform to show weeks
    if (filterType === 'month') {
      // For month filter, create 4 weeks of data
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4']
      
      // Distribute data across weeks
      const totalCreated = data.reduce((sum, item) => sum + (item.created || 0), 0)
      const totalCompleted = data.reduce((sum, item) => sum + (item.completed || 0), 0)
      
      return weeks.map((week, index) => ({
        month: week,
        created: Math.floor(totalCreated / 4),
        completed: Math.floor(totalCompleted / 4),
      }))
    }
    
    return data
  }, [data, filterType])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card h-[400px]"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Created vs Completed Trend</h3>
        <select 
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as ViewMode)}
          className="text-xs border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
      
      {!aggregatedData || aggregatedData.length === 0 ? (
        <div className="flex items-center justify-center h-[320px] text-muted-foreground text-sm">
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={aggregatedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              stroke="#9ca3af"
              label={filterType === 'month' ? { value: 'Week', position: 'insideBottom', offset: -5, fontSize: 11 } : undefined}
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
