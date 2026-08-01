'use client'

import { motion } from 'framer-motion'
import { FolderKanban, AlertTriangle, Clock, CheckCircle2, Heart } from 'lucide-react'

interface HealthKPICardsProps {
  data: any
  isLoading: boolean
}

export function HealthKPICards({ data, isLoading }: HealthKPICardsProps) {
  const summary = data?.summary || {}

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
      icon: FolderKanban,
      textColor: 'text-blue-600',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Projects at Risk',
      value: summary.atRiskCount || 0,
      icon: AlertTriangle,
      textColor: 'text-amber-600',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
    },
    {
      label: 'Projects Delayed',
      value: summary.criticalCount || 0,
      icon: Clock,
      textColor: 'text-red-600',
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
    },
    {
      label: 'On Track',
      value: (summary.excellentCount || 0) + (summary.goodCount || 0),
      icon: CheckCircle2,
      textColor: 'text-green-600',
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-500',
    },
    {
      label: 'Avg Health Score',
      value: `${summary.avgHealthScore || 0}%`,
      icon: Heart,
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
              
              <p className={`text-3xl font-bold ${card.textColor}`}>
                {card.value}
              </p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
