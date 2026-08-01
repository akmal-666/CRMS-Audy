'use client'

import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface HealthByCategoryProps {
  data: any[]
  isLoading: boolean
}

export function HealthByCategory({ data, isLoading }: HealthByCategoryProps) {
  if (isLoading) {
    return (
      <div className="card h-[350px] animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  // Group projects by department/category
  const chartData = data || [
    { category: 'Infrastructure', score: 82 },
    { category: 'Application', score: 65 },
    { category: 'Integration', score: 58 },
    { category: 'Data & Analytics', score: 75 },
    { category: 'Business Support', score: 70 },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card h-[350px]"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Health Score by Project Category</h3>
        <select className="text-xs border rounded px-2 py-1 bg-background">
          <option>All Categories</option>
        </select>
      </div>

      <ResponsiveContainer width="100%" height={270}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            stroke="#9ca3af"
          />
          <YAxis
            type="category"
            dataKey="category"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            stroke="#9ca3af"
            width={75}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: any) => [`${value}%`, 'Health Score']}
          />
          <Bar
            dataKey="score"
            fill="#3b82f6"
            radius={[0, 4, 4, 0]}
            maxBarSize={25}
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
