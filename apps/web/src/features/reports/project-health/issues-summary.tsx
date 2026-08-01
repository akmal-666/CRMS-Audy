import { motion } from 'framer-motion'
import { AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react'

interface IssuesSummaryProps {
  data: any
  isLoading: boolean
}

export function IssuesSummary({ data, isLoading }: IssuesSummaryProps) {
  if (isLoading) {
    return (
      <div className="card h-[200px] animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  const issues = [
    {
      label: 'Open Issues',
      value: data?.open || 128,
      change: '+18',
      changePercent: '1%',
      trend: 'vs last month',
      icon: AlertCircle,
      color: 'red',
      bgGradient: 'from-red-50 to-red-100 dark:from-red-950 dark:to-red-900',
      textColor: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-red-500/20',
    },
    {
      label: 'In Progress',
      value: data?.inProgress || 76,
      change: '+12%',
      changePercent: '13%',
      trend: 'vs last month',
      icon: Clock,
      color: 'blue',
      bgGradient: 'from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900',
      textColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-500/20',
    },
    {
      label: 'Completed',
      value: data?.completed || 152,
      change: '+38',
      changePercent: '28%',
      trend: 'vs last month',
      icon: CheckCircle2,
      color: 'green',
      bgGradient: 'from-green-50 to-green-100 dark:from-green-950 dark:to-green-900',
      textColor: 'text-green-600 dark:text-green-400',
      iconBg: 'bg-green-500/20',
    },
    {
      label: 'Blocked',
      value: data?.blocked || 15,
      change: '-5',
      changePercent: '6%',
      trend: 'vs last month',
      icon: XCircle,
      color: 'gray',
      bgGradient: 'from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900',
      textColor: 'text-gray-600 dark:text-gray-400',
      iconBg: 'bg-gray-500/20',
    },
  ]

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Issues Summary (All Projects)</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {issues.map((issue, index) => {
          const Icon = issue.icon
          const isPositiveTrend = issue.change.startsWith('+')

          return (
            <motion.div
              key={issue.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`card bg-gradient-to-br ${issue.bgGradient}`}
            >
              <div className="flex items-start justify-between mb-2">
                <p className={`text-xs font-medium ${issue.textColor} uppercase tracking-wide`}>
                  {issue.label}
                </p>
                <div className={`p-1.5 rounded-lg ${issue.iconBg}`}>
                  <Icon size={14} className={issue.textColor} />
                </div>
              </div>
              
              <p className={`text-3xl font-bold ${issue.textColor} mb-1`}>
                {issue.value}
              </p>
              
              <div className="flex items-center gap-1">
                <span className={`text-xs font-medium ${isPositiveTrend ? 'text-green-600' : 'text-red-600'}`}>
                  {issue.change}
                </span>
                <span className={`text-xs ${issue.textColor} opacity-70`}>
                  {issue.trend}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
