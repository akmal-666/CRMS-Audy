import { motion } from 'framer-motion'

interface WorkloadChartProps {
  data: any[]
  isLoading: boolean
}

export function WorkloadChart({ data, isLoading }: WorkloadChartProps) {
  if (isLoading) {
    return (
      <div className="card h-[360px] animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card h-[360px] flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Workload by Assignee (Top 5)</h3>
        <button className="text-xs text-primary hover:underline">View full workload report</button>
      </div>

      {!data || data.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
          No workload data
        </div>
      ) : (
        <div className="space-y-3 overflow-auto flex-1">
          <div className="grid grid-cols-12 text-xs font-medium text-muted-foreground px-2">
            <div className="col-span-4">Assignee</div>
            <div className="col-span-2 text-center">Assigned</div>
            <div className="col-span-2 text-center">Completed</div>
            <div className="col-span-2 text-center">Remaining</div>
            <div className="col-span-2 text-center">Utilization</div>
          </div>

          {data.map((assignee, index) => (
            <motion.div
              key={assignee.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="grid grid-cols-12 items-center p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="col-span-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                  {assignee.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{assignee.name}</p>
                </div>
              </div>

              <div className="col-span-2 text-center">
                <span className="text-sm font-semibold text-foreground">{assignee.assigned}</span>
              </div>

              <div className="col-span-2 text-center">
                <span className="text-sm font-medium text-green-600">{assignee.completed}</span>
              </div>

              <div className="col-span-2 text-center">
                <span className="text-sm font-medium text-orange-600">{assignee.remaining}</span>
              </div>

              <div className="col-span-2">
                <div className="flex flex-col items-center">
                  <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(assignee.utilization, 100)}%` }}
                      transition={{ duration: 0.6, delay: index * 0.05 }}
                      className={`absolute top-0 left-0 h-full rounded-full ${
                        assignee.utilization >= 80
                          ? 'bg-red-500'
                          : assignee.utilization >= 60
                          ? 'bg-orange-500'
                          : 'bg-green-500'
                      }`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">{assignee.utilization}%</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
