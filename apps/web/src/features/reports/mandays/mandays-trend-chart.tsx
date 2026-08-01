'use client'

import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface MandaysTrendChartProps {
  data: any[]
  isLoading: boolean
  filterType?: 'year' | 'quarter' | 'month' | 'custom'
}

export function MandaysTrendChart({ data, isLoading, filterType }: MandaysTrendChartProps) {
  if (isLoading) {
    return (
      <div className="card h-[400px] animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  const chartData = data || []

  const getXAxisLabel = () => {
    switch (filterType) {
      case 'month': return 'Week'
      case 'quarter': return 'Month'
      case 'year': return 'Month'
      case 'custom': return 'Month'
      default: return 'Month'
    }
  }

  const getTitle = () => {
    switch (filterType) {
      case 'month': return 'Mandays Trend by Week'
      case 'quarter': return 'Mandays Trend by Month (Quarter)'
      case 'year': return 'Mandays Trend by Month (Yearly)'
      case 'custom': return 'Mandays Trend (Custom Range)'
      default: return 'Mandays Trend (Actual)'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card h-[400px]"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">{getTitle()}</h3>
      
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[320px] text-muted-foreground text-sm">
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ bottom: filterType === 'month' ? 10 : 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              stroke="#9ca3af"
              label={
                filterType
                  ? { value: getXAxisLabel(), position: 'insideBottom', offset: -2, fontSize: 11, fill: '#6b7280' }
                  : undefined
              }
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              stroke="#9ca3af"
              label={{ value: 'MD', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#6b7280' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: any) => [`${value} MD`, '']}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} iconType="line" />
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual Mandays"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="topup"
              name="Top-up"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#f59e0b', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  )
}
