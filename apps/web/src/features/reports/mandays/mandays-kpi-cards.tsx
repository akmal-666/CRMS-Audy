'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'

interface MandaysKPICardsProps {
  data: any
  isLoading: boolean
}

export function MandaysKPICards({ data, isLoading }: MandaysKPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card h-24 animate-pulse">
            <div className="h-full bg-muted rounded" />
          </div>
        ))}
      </div>
    )
  }

  const summary = data?.summary || {}

  const cards = [
    {
      title: 'Total Mandays (Actual)',
      value: summary.totalUsed || 0,
      suffix: 'MD',
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      change: '+9.2% vs last period',
    },
    {
      title: 'Mandays Used (%)',
      value: summary.avgUtilization || 0,
      suffix: '%',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      change: summary.avgUtilization >= 80 ? '+6.1% vs last period' : '',
    },
    {
      title: 'Remaining Mandays',
      value: summary.totalRemaining || 0,
      suffix: 'MD',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      change: summary.totalRemaining < 50 ? '-18.2% vs last period' : '',
    },
    {
      title: 'Avg. Deviation',
      value: '-12.4',
      suffix: '%',
      icon: summary.avgUtilization > 100 ? TrendingUp : TrendingDown,
      color: summary.avgUtilization > 100 ? 'text-red-600' : 'text-green-600',
      bgColor: summary.avgUtilization > 100 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20',
      change: '↓ Better vs last period',
    },
    {
      title: 'Top-up Mandays',
      value: summary.totalTopup || 0,
      suffix: 'MD',
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      change: summary.totalTopup > 0 ? `+${summary.totalTopup} MD added` : 'No top-ups',
    },
  ]

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="card bg-white dark:bg-gray-800"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">{card.title}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-foreground">
                    {typeof card.value === 'number' ? card.value.toFixed(1) : card.value}
                  </span>
                  <span className="text-xs text-muted-foreground">{card.suffix}</span>
                </div>
                {card.change && (
                  <p className="text-[10px] text-muted-foreground mt-1">{card.change}</p>
                )}
              </div>
              <div className={`${card.bgColor} p-2 rounded-lg`}>
                <Icon size={20} className={card.color} />
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
