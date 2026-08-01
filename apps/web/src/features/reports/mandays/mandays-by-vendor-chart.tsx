'use client'

import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface MandaysByVendorChartProps {
  data: any[]
  isLoading: boolean
}

export function MandaysByVendorChart({ data, isLoading }: MandaysByVendorChartProps) {
  if (isLoading) {
    return (
      <div className="card h-[400px] animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  const chartData = data || []

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card h-[400px]"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">Mandays by Platform / Vendor</h3>
      
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[320px] text-muted-foreground text-sm">
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="vendorName"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              stroke="#9ca3af"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              stroke="#9ca3af"
              label={{ value: 'Mandays', angle: -90, position: 'insideLeft', fontSize: 11 }}
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
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="actual" name="Actual" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="topup" name="Top-up" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  )
}
