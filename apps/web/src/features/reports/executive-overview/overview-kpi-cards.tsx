'use client'

import { motion } from 'framer-motion'
import { FileText, FolderKanban, CheckCircle2, AlertCircle, Clock, TrendingUp } from 'lucide-react'

interface OverviewKPICardsProps {
  data: any
  isLoading: boolean
}

export function OverviewKPICards({ data, isLoading }: OverviewKPICardsProps) {
  const summary = data?.summary || {}

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
      icon: FileText,
      textColor: 'text-blue-600',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Active Projects',
      value: summary.activeProjects || 0,
      icon: FolderKanban,
      textColor: 'text-purple-600',
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-500',
    },
    {
      label: 'Completed',
      value: summary.completed || 0,
      icon: CheckCircle2,
      textColor: 'text-green-600',
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-500',
    },
    {
      label: 'Delayed',
      value: summary.delayed || 0,
      icon: AlertCircle,
      textColor: 'text-red-600',
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
    },
    {
      label: 'Avg Cycle Time',
      value: `${summary.avgCycleTimeDays || 0} days`,
      icon: Clock,
      textColor: 'text-orange-600',
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
    },
    {
      label: 'SLA Achievement',
      value: `${summary.slaAchievement || 0}%`,
      icon: TrendingUp,
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
            
            <p className={`text-2xl font-bold ${card.textColor}`}>
              {card.value}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
