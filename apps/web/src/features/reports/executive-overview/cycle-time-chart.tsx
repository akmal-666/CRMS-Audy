import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface CycleTimeChartProps {
  data: any[]
  isLoading: boolean
}

const STAGE_LABELS: Record<string, string> = {
  assessment: 'Assessment',
  development: 'Development',
  uat: 'UAT / Testing',
  deployment: 'Deployment',
}

export function CycleTimeChart({ data, isLoading }: CycleTimeChartProps) {
  if (isLoading) {
    return (
      <div className="card h-[360px] animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  const chartData = (data || []).map(item => ({
    stage: STAGE_LABELS[item.stage] || item.stage,
    days: item.avgDays,
  }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card h-[360px]"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Average Cycle Time (by Stage)</h3>
        <span className="text-xs text-muted-foreground">Days</span>
      </div>

      {!chartData || chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
          No cycle time data
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="stage"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                stroke="#9ca3af"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                stroke="#9ca3af"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: any) => [`${value} days`, 'Avg Time']}
              />
              <Bar
                dataKey="days"
                fill="#3b82f6"
                radius={[6, 6, 0, 0]}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-3 text-center">
            <button className="text-xs text-primary hover:underline">
              View cycle time report
            </button>
          </div>
        </>
      )}
    </motion.div>
  )
}
