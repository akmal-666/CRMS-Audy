'use client'

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
      textColor: 'text-blue-600',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Projects at Risk',
      value: summary.atRiskCount || 0,
      trend: atRiskTrend,
      trendText: 'vs last month',
      trendUp: false,
      icon: AlertTriangle,
      color: 'amber',
      textColor: 'text-amber-600',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
    },
    {
      label: 'Projects Delayed',
      value: summary.criticalCount || 0,
      trend: delayedTrend,
      trendText: 'vs last month',
      trendUp: true,
      icon: Clock,
      color: 'red',
      textColor: 'text-red-600',
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
    },
    {
      label: 'On Track',
      value: (summary.excellentCount || 0) + (summary.goodCount || 0),
      trend: onTrackTrend,
      trendText: 'vs last month',
      trendUp: true,
      icon: CheckCircle2,
      color: 'green',
      textColor: 'text-green-600',
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-500',
    },
    {
      label: 'Avg Health Score',
      value: `${summary.avgHealthScore || 0}%`,
      trend: avgScoreTrend,
      trendText: 'vs last month',
      trendUp: true,
      icon: Heart,
      color: 'purple',
      textColor: 'text-purple-600',
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-500',
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
            className="card bg-white dark:bg-gray-800"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {card.label}
                </p>
                <div className={`p-2 rounded-lg ${card.iconBg}`}>
                  <Icon size={20} className={card.iconColor} />
                </div>
              </div>
              
              <p className={`text-3xl font-bold ${card.textColor} mb-3`}>
                {card.value}
              </p>
              
              <div className="flex items-center gap-1 mt-auto">
                <span className={`text-xs font-medium ${card.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                  {card.trend}
                </span>
                <span className="text-xs text-muted-foreground">
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
