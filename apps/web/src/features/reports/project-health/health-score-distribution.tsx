'use client'

import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface HealthScoreDistributionProps {
  data: any
  isLoading: boolean
  total: number
}

const HEALTH_COLORS = {
  excellent: '#10b981', // green
  good: '#3b82f6', // blue
  atRisk: '#f59e0b', // amber
  critical: '#ef4444', // red
}

export function HealthScoreDistribution({ data, isLoading, total }: HealthScoreDistributionProps) {
  if (isLoading) {
    return (
      <div className="card h-[600px] animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  const chartData = [
    { name: 'Excellent (80-100%)', value: data?.excellent?.length || 0, fill: HEALTH_COLORS.excellent, range: '80-100%' },
    { name: 'Good (60-79%)', value: data?.good?.length || 0, fill: HEALTH_COLORS.good, range: '60-79%' },
    { name: 'At Risk (40-59%)', value: data?.atRisk?.length || 0, fill: HEALTH_COLORS.atRisk, range: '40-59%' },
    { name: 'Poor (0-39%)', value: data?.critical?.length || 0, fill: HEALTH_COLORS.critical, range: '0-39%' },
  ]

  const totalProjects = chartData.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="card h-[600px] flex flex-col">
      <h3 className="text-sm font-semibold text-foreground mb-4">Health Score Distribution</h3>
      
      {totalProjects === 0 ? (
        <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
          No data available
        </div>
      ) : (
        <>
          <div className="relative flex-1">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
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
                  formatter={(value: any) => [`${value} projects`, 'Count']}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center text - positioned absolutely on top of chart */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-4xl font-bold text-foreground">{totalProjects}</div>
                <div className="text-xs text-muted-foreground mt-1">Projects</div>
              </div>
            </div>
          </div>

          {/* Legend with percentages */}
          <div className="space-y-2 mt-4">
            {chartData.map((item) => {
              const percentage = totalProjects > 0 ? ((item.value / totalProjects) * 100).toFixed(0) : 0
              return (
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
                    <span className="text-xs text-muted-foreground">({percentage}%)</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
