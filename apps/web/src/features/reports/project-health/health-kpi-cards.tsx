import { motion } from 'framer-motion'
import { FolderKanban, AlertTriangle, Clock, CheckCircle2, Heart } from 'lucide-react'

interface HealthKPICardsProps {
  data: any
  isLoading: boolean
}

export function HealthKPICards({ data, isLoading }: HealthKPICardsProps) {
  const summary = data?.summary || {}
  
  // Calculate trends (mock for now)
  const totalTrend = '+2'
  const atRiskTrend = '+1'
  const delayedTrend = '-1'
  const onTrackTrend = '+1'
  const avgScoreTrend = '+8%'

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-24 bg-muted rounded" />
          </div>
        ))}
      </div>
    )
  }

  const cards = [
    {
      label: 'Total Projects',
      value: summary.totalProjects || 0,
      trend: totalTrend,
      trendText: 'vs last month',
      trendUp: true,
      icon: FolderKanban,
      color: 'blue',
      bgGradient: 'from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900',
      border: 'border-blue-200 dark:border-blue-800',
      textColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-500/20',
    },
    {
      label: 'Projects at Risk',
      value: summary.atRiskCount || 0,
      trend: atRiskTrend,
      trendText: 'vs last month',
      trendUp: false,
      icon: AlertTriangle,
      color: 'amber',
      bgGradient: 'from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900',
      border: 'border-amber-200 dark:border-amber-800',
      textColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-500/20',
    },
    {
      label: 'Projects Delayed',
      value: summary.criticalCount || 0,
      trend: delayedTrend,
      trendText: 'vs last month',
      trendUp: true,
      icon: Clock,
      color: 'red',
      bgGradient: 'from-red-50 to-red-100 dark:from-red-950 dark:to-red-900',
      border: 'border-red-200 dark:border-red-800',
      textColor: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-red-500/20',
    },
    {
      label: 'On Track',
      value: (summary.excellentCount || 0) + (summary.goodCount || 0),
      trend: onTrackTrend,
      trendText: 'vs last month',
      trendUp: true,
      icon: CheckCircle2,
      color: 'green',
      bgGradient: 'from-green-50 to-green-100 dark:from-green-950 dark:to-green-900',
      border: 'border-green-200 dark:border-green-800',
      textColor: 'text-green-600 dark:text-green-400',
      iconBg: 'bg-green-500/20',
    },
    {
      label: 'Avg Health Score',
      value: `${summary.avgHealthScore || 0}%`,
      trend: avgScoreTrend,
      trendText: 'vs last month',
      trendUp: true,
      icon: Heart,
      color: 'purple',
      bgGradient: 'from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900',
      border: 'border-purple-200 dark:border-purple-800',
      textColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-500/20',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon

        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`card bg-gradient-to-br ${card.bgGradient} ${card.border}`}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-2">
                <p className={`text-xs font-medium ${card.textColor} uppercase tracking-wide`}>
                  {card.label}
                </p>
                <div className={`p-1.5 rounded-lg ${card.iconBg}`}>
                  <Icon size={16} className={card.textColor} />
                </div>
              </div>
              
              <p className={`text-3xl font-bold ${card.textColor.replace('400', '300').replace('600', '700')} mb-2`}>
                {card.value}
              </p>
              
              <div className="flex items-center gap-1 mt-auto">
                <span className={`text-xs font-medium ${card.trendUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {card.trend}
                </span>
                <span className={`text-xs ${card.textColor} opacity-70`}>
                  {card.trendText}
                </span>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
