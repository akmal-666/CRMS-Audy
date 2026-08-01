'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface HealthByCategoryProps {
  data: any[]
  isLoading: boolean
}

export function HealthByCategory({ data, isLoading }: HealthByCategoryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Get unique categories from data
  const categories = useMemo(() => {
    if (!data || data.length === 0) return []
    return ['all', ...Array.from(new Set(data.map(item => item.category || item.department)))]
  }, [data])

  // Filter data based on selected category
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return [
        { category: 'Infrastructure', score: 82 },
        { category: 'Application', score: 65 },
        { category: 'Integration', score: 58 },
        { category: 'Data & Analytics', score: 75 },
        { category: 'Business Support', score: 70 },
      ]
    }
    
    if (selectedCategory === 'all') {
      return data
    }
    
    return data.filter(item => 
      (item.category === selectedCategory) || (item.department === selectedCategory)
    )
  }, [data, selectedCategory])

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
        <h3 className="text-sm font-semibold text-foreground">Health Score by Project Category</h3>
        <select 
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="text-xs border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {categories.length > 0 ? (
            categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))
          ) : (
            <option value="all">All Categories</option>
          )}
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
