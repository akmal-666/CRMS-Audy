import { motion } from 'framer-motion'
import { BarChart3, CheckCircle2, Clock, Target } from 'lucide-react'

interface KPICardsProps {
  data: any
  isLoading: boolean
}

export function KPICards({ data, isLoading }: KPICardsProps) {
  const summary = data?.summary || {}
  const slaCompliance = data?.slaCompliance || {}
  
  const completionRate = summary.totalRequests > 0 
    ? ((summary.completedRequests / summary.totalRequests) * 100).toFixed(1) 
    : 0

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-20 bg-muted rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
              Total Requests
            </p>
            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-2">
              {summary.totalRequests || 0}
            </p>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">In selected period</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/20">
            <BarChart3 size={24} className="text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
              Completed
            </p>
            <p className="text-3xl font-bold text-green-700 dark:text-green-300 mt-2">
              {summary.completedRequests || 0}
            </p>
            <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">
              {completionRate}% completion rate
            </p>
          </div>
          <div className="p-3 rounded-xl bg-green-500/20">
            <CheckCircle2 size={24} className="text-green-600 dark:text-green-400" />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide">
              Avg Cycle Time
            </p>
            <p className="text-3xl font-bold text-orange-700 dark:text-orange-300 mt-2">
              {summary.avgCycleTimeDays || 0}
            </p>
            <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-1">days to complete</p>
          </div>
          <div className="p-3 rounded-xl bg-orange-500/20">
            <Clock size={24} className="text-orange-600 dark:text-orange-400" />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">
              SLA Compliance
            </p>
            <p className="text-3xl font-bold text-purple-700 dark:text-purple-300 mt-2">
              {summary.slaCompliance || 0}%
            </p>
            <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1">
              {slaCompliance.met || 0}/{slaCompliance.total || 0} on time
            </p>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/20">
            <Target size={24} className="text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </motion.div>
    </div>
  )
}
