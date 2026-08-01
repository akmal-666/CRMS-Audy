'use client'

import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface PriorityChartProps {
  data: any[]
  isLoading: boolean
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444', // red
  high: '#f59e0b', // amber
  medium: '#3b82f6', // blue
  low: '#6b7280', // gray
}

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export function PriorityChart({ data, isLoading }: PriorityChartProps) {
  if (isLoading) {
    return (
      <div className="card h-[360px] animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  const chartData = (data || []).map(item => ({
    name: PRIORITY_LABELS[item.priority] || item.priority,
    value: item.count,
    percentage: item.percentage,
    fill: PRIORITY_COLORS[item.priority] || '#6b7280',
  }))

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card h-[360px]"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">Requests by Priority</h3>
      
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
          No data available
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
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

          {/* List breakdown */}
          <div className="space-y-2 mt-4">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{item.value}</span>
                  <span className="text-xs text-muted-foreground">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  )
}
