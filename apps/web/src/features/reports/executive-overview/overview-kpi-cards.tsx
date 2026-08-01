import { motion } from 'framer-motion'
import { FileText, FolderKanban, CheckCircle2, AlertCircle, Clock, TrendingUp } from 'lucide-react'

interface OverviewKPICardsProps {
  data: any
  isLoading: boolean
}

export function OverviewKPICards({ data, isLoading }: OverviewKPICardsProps) {
  const summary = data?.summary || {}
  
  // Calculate trend (mock for now - would compare with previous period)
  const totalTrend = '+15%'
  const activeTrend = '+8%'
  const completedTrend = '+23%'
  const delayedTrend = '-12%'
  const cycleTrend = '-2 days'
  const slaTrend = '+5%'

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-24 bg-muted rounded" />
          </div>
        ))}
      </div>
    )
  }

  const cards = [
    {
      label: 'Total Requests',
      value: summary.totalRequests || 0,
      trend: totalTrend,
      trendUp: true,
      icon: FileText,
      color: 'blue',
      bgGradient: 'from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900',
      borderColor: 'border-blue-200 dark:border-blue-800',
      textColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-500/20',
    },
    {
      label: 'Active Projects',
      value: summary.activeProjects || 0,
      trend: activeTrend,
      trendUp: true,
      icon: FolderKanban,
      color: 'purple',
      bgGradient: 'from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900',
      borderColor: 'border-purple-200 dark:border-purple-800',
      textColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-500/20',
    },
    {
      label: 'Completed',
      value: summary.completed || 0,
      trend: completedTrend,
      trendUp: true,
      icon: CheckCircle2,
      color: 'green',
      bgGradient: 'from-green-50 to-green-100 dark:from-green-950 dark:to-green-900',
      borderColor: 'border-green-200 dark:border-green-800',
      textColor: 'text-green-600 dark:text-green-400',
      iconBg: 'bg-green-500/20',
    },
    {
      label: 'Delayed',
      value: summary.delayed || 0,
      trend: delayedTrend,
      trendUp: false,
      icon: AlertCircle,
      color: 'red',
      bgGradient: 'from-red-50 to-red-100 dark:from-red-950 dark:to-red-900',
      borderColor: 'border-red-200 dark:border-red-800',
      textColor: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-red-500/20',
    },
    {
      label: 'Avg Cycle Time',
      value: `${summary.avgCycleTimeDays || 0} days`,
      trend: cycleTrend,
      trendUp: false,
      icon: Clock,
      color: 'orange',
      bgGradient: 'from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900',
      borderColor: 'border-orange-200 dark:border-orange-800',
      textColor: 'text-orange-600 dark:text-orange-400',
      iconBg: 'bg-orange-500/20',
    },
    {
      label: 'SLA Achievement',
      value: `${summary.slaAchievement || 0}%`,
      trend: slaTrend,
      trendUp: true,
      icon: TrendingUp,
      color: 'indigo',
      bgGradient: 'from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900',
      borderColor: 'border-indigo-200 dark:border-indigo-800',
      textColor: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-500/20',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`card bg-gradient-to-br ${card.bgGradient} ${card.borderColor}`}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-start justify-between mb-2">
              <p className={`text-xs font-medium ${card.textColor} uppercase tracking-wide`}>
                {card.label}
              </p>
              <div className={`p-1.5 rounded-lg ${card.iconBg}`}>
                <card.icon size={16} className={card.textColor} />
              </div>
            </div>
            
            <p className={`text-2xl font-bold ${card.textColor.replace('400', '300').replace('600', '700')} mb-1`}>
              {card.value}
            </p>
            
            <div className="flex items-center gap-1 mt-auto">
              <span className={`text-xs font-medium ${card.trendUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {card.trend}
              </span>
              <span className={`text-xs ${card.textColor} opacity-70`}>
                vs 1 Jun - 30 Jun 2026
              </span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
