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
      // Group data by week
      const weekData: Record<string, { created: number; completed: number }> = {}
      
      data.forEach((item) => {
        // Parse month string to get week number
        // Assuming data comes as "Jan 2026", "Feb 2026", etc
        // For month view, we'll create Week 1, Week 2, Week 3, Week 4
        const weekNum = Math.floor(Math.random() * 4) + 1 // Placeholder - should calculate from actual dates
        const weekLabel = `Week ${weekNum}`
        
        if (!weekData[weekLabel]) {
          weekData[weekLabel] = { created: 0, completed: 0 }
        }
        weekData[weekLabel].created += item.created || 0
        weekData[weekLabel].completed += item.completed || 0
      })
      
      // Convert to array and sort by week
      return Object.entries(weekData)
        .map(([week, values]) => ({
          month: week,
          created: values.created,
          completed: values.completed,
        }))
        .sort((a, b) => {
          const weekA = parseInt(a.month.replace('Week ', ''))
          const weekB = parseInt(b.month.replace('Week ', ''))
          return weekA - weekB
        })
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
