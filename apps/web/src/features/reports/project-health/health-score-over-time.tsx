import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface HealthScoreOverTimeProps {
  data: any[]
  isLoading: boolean
}

export function HealthScoreOverTime({ data, isLoading }: HealthScoreOverTimeProps) {
  if (isLoading) {
    return (
      <div className="card h-[350px] animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  // Transform data to show average health score over time
  const chartData = (data || []).map(item => ({
    month: item.month,
    avgScore: Math.round(
      ((item.excellent || 0) * 90 + (item.good || 0) * 70 + (item.atRisk || 0) * 50 + (item.critical || 0) * 25) /
      Math.max(1, (item.excellent || 0) + (item.good || 0) + (item.atRisk || 0) + (item.critical || 0))
    ),
  }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card h-[350px]"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Health Score Over Time</h3>
        <select className="text-xs border rounded px-2 py-1 bg-background">
          <option>Daily</option>
          <option>Weekly</option>
          <option>Monthly</option>
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
              dataKey="month"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              stroke="#9ca3af"
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
