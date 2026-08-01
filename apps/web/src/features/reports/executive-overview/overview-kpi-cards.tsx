'use client'

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
      textColor: 'text-blue-600',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Active Projects',
      value: summary.activeProjects || 0,
      trend: activeTrend,
      trendUp: true,
      icon: FolderKanban,
      color: 'purple',
      textColor: 'text-purple-600',
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-500',
    },
    {
      label: 'Completed',
      value: summary.completed || 0,
      trend: completedTrend,
      trendUp: true,
      icon: CheckCircle2,
      color: 'green',
      textColor: 'text-green-600',
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-500',
    },
    {
      label: 'Delayed',
      value: summary.delayed || 0,
      trend: delayedTrend,
      trendUp: false,
      icon: AlertCircle,
      color: 'red',
      textColor: 'text-red-600',
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
    },
    {
      label: 'Avg Cycle Time',
      value: `${summary.avgCycleTimeDays || 0} days`,
      trend: cycleTrend,
      trendUp: false,
      icon: Clock,
      color: 'orange',
      textColor: 'text-orange-600',
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
    },
    {
      label: 'SLA Achievement',
      value: `${summary.slaAchievement || 0}%`,
      trend: slaTrend,
      trendUp: true,
      icon: TrendingUp,
      color: 'indigo',
      textColor: 'text-indigo-600',
      iconBg: 'bg-indigo-500/10',
      iconColor: 'text-indigo-500',
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
          className="card bg-white dark:bg-gray-800"
        >
          <div className="flex flex-col h-full">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {card.label}
              </p>
              <div className={`p-2 rounded-lg ${card.iconBg}`}>
                <card.icon size={20} className={card.iconColor} />
              </div>
            </div>
            
            <p className={`text-2xl font-bold ${card.textColor} mb-2`}>
              {card.value}
            </p>
            
            <div className="flex items-center gap-1 mt-auto">
              <span className={`text-xs font-medium ${card.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                {card.trend}
              </span>
              <span className="text-xs text-muted-foreground">
                vs 1 Jun - 30 Jun 2026
              </span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
