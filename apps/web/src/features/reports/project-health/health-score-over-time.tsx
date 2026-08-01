'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface HealthScoreOverTimeProps {
  data: any[]
  isLoading: boolean
}

type TimeRange = 'daily' | 'weekly' | 'monthly'

export function HealthScoreOverTime({ data, isLoading }: HealthScoreOverTimeProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('monthly')

  // Transform data based on time range
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    // Calculate avgScore from health distribution
    const dataWithScores = data.map(item => {
      const total = (item.excellent || 0) + (item.good || 0) + (item.atRisk || 0) + (item.critical || 0)
      const avgScore = total > 0 ? Math.round(
        ((item.excellent || 0) * 90 + (item.good || 0) * 70 + (item.atRisk || 0) * 50 + (item.critical || 0) * 25) / total
      ) : 0
      return { ...item, avgScore }
    })
    
    // Transform labels based on time range
    if (timeRange === 'daily') {
      // For daily: show as hours (00:00, 04:00, 08:00, etc.)
      return dataWithScores.map((item, index) => ({
        ...item,
        label: `${String(index * 4).padStart(2, '0')}:00`
      }))
    } else if (timeRange === 'weekly') {
      // For weekly: show as days (Mon, Tue, Wed, etc.)
      const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      return dataWithScores.slice(0, 7).map((item, index) => ({
        ...item,
        label: daysOfWeek[index]
      }))
    } else {
      // For monthly: use the month label from API (e.g., "Jan 2026")
      return dataWithScores.map(item => ({
        ...item,
        label: item.month
      }))
    }
  }, [data, timeRange])

  // Get X-axis label based on time range
  const getXAxisLabel = () => {
    switch (timeRange) {
      case 'daily': return 'Hour'
      case 'weekly': return 'Day'
      case 'monthly': return 'Month'
      default: return ''
    }
  }

  if (isLoading) {
    return (
      <div className="card h-[350px] animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card h-[350px]"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Health Score Over Time</h3>
        <select 
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as TimeRange)}
          className="text-xs border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      {!chartData || chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[270px] text-muted-foreground text-sm">
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={270}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              stroke="#9ca3af"
              label={{ value: getXAxisLabel(), position: 'insideBottom', offset: -5, fontSize: 11 }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              stroke="#9ca3af"
              label={{ value: '%', angle: -90, position: 'insideLeft', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: any) => [`${value}%`, 'Avg Health Score']}
            />
            <Line
              type="monotone"
              dataKey="avgScore"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  )
}
