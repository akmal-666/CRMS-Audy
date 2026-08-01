'use client'

import { motion } from 'framer-motion'
import { BarChart3, Star, TrendingUp, Clock, Users } from 'lucide-react'
import Link from 'next/link'

export function ReportsPage() {
  const modules = [
    {
      href: '/reports/executive-overview',
      icon: Star,
      iconFill: true,
      title: 'Executive Overview',
      description: 'High-level portfolio summary',
      gradient: 'from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900',
      border: 'border-amber-200 dark:border-amber-800',
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      textColor: 'text-amber-700 dark:text-amber-300',
      descColor: 'text-amber-600/70 dark:text-amber-400/70',
      available: true,
    },
    {
      href: '/reports/project-health',
      icon: TrendingUp,
      iconFill: false,
      title: 'Project Health',
      description: 'Coming soon',
      gradient: 'from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900',
      border: 'border-blue-200 dark:border-blue-800',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      textColor: 'text-blue-700 dark:text-blue-300',
      descColor: 'text-blue-600/70 dark:text-blue-400/70',
      available: false,
    },
    {
      href: '/reports/cycle-time-sla',
      icon: Clock,
      iconFill: false,
      title: 'Cycle Time & SLA',
      description: 'Coming soon',
      gradient: 'from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900',
      border: 'border-purple-200 dark:border-purple-800',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      textColor: 'text-purple-700 dark:text-purple-300',
      descColor: 'text-purple-600/70 dark:text-purple-400/70',
      available: false,
    },
    {
      href: '/reports/workload-team',
      icon: Users,
      iconFill: false,
      title: 'Workload Team',
      description: 'Coming soon',
      gradient: 'from-green-50 to-green-100 dark:from-green-950 dark:to-green-900',
      border: 'border-green-200 dark:border-green-800',
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-600 dark:text-green-400',
      textColor: 'text-green-700 dark:text-green-300',
      descColor: 'text-green-600/70 dark:text-green-400/70',
      available: false,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <BarChart3 size={22} className="text-primary" />
          Reports & Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Comprehensive insights and performance metrics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {modules.map((module, index) => {
          const Icon = module.icon
          const content = (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={module.available ? { scale: 1.02 } : {}}
              className={`card bg-gradient-to-br ${module.gradient} ${module.border} ${
                module.available ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
              } h-full transition-all`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${module.iconBg}`}>
                  <Icon 
                    size={24} 
                    className={module.iconColor} 
                    fill={module.iconFill ? 'currentColor' : 'none'}
                  />
                </div>
                <div>
                  <h3 className={`font-semibold ${module.textColor}`}>{module.title}</h3>
                  <p className={`text-xs ${module.descColor} mt-0.5`}>
                    {module.description}
                  </p>
                </div>
              </div>
            </motion.div>
          )

          return module.available ? (
            <Link key={module.href} href={module.href}>
              {content}
            </Link>
          ) : (
            <div key={module.href}>{content}</div>
          )
        })}
      </div>
    </div>
  )
}
