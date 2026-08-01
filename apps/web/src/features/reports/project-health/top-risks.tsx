'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, AlertCircle } from 'lucide-react'

interface TopRisksProps {
  data: any[]
  isLoading: boolean
}

export function TopRisks({ data, isLoading }: TopRisksProps) {
  if (isLoading) {
    return (
      <div className="card h-[350px] animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  const risks = data || [
    {
      project: 'Mobile App',
      risk: 'Scope creep',
      impact: 'High',
      status: 'Open',
      owner: 'Jessica Lee',
      updated: '30m ago',
    },
    {
      project: 'Data Warehouse',
      risk: 'Resource constraint',
      impact: 'High',
      status: 'Open',
      owner: 'Budi Santoso',
      updated: '1h ago',
    },
    {
      project: 'CRM Integration',
      risk: 'Dependency delay',
      impact: 'Medium',
      status: 'In Progress',
      owner: 'Rama Putra',
      updated: '2h ago',
    },
  ]

  const getImpactColor = (impact: string) => {
    if (impact === 'High') return 'text-red-600 bg-red-100 dark:bg-red-900/30'
    if (impact === 'Medium') return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30'
    return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
  }

  const getStatusColor = (status: string) => {
    if (status === 'Open') return 'text-red-600 bg-red-100 dark:bg-red-900/30'
    if (status === 'In Progress') return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30'
    return 'text-green-600 bg-green-100 dark:bg-green-900/30'
  }

  return (
    <div className="card h-[350px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Top Risks</h3>
        <button className="text-xs text-primary hover:underline">View all risks</button>
      </div>

      <div className="flex-1 overflow-auto space-y-3">
        {risks.map((risk, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{risk.project}</p>
                  <p className="text-xs text-muted-foreground">{risk.risk}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getImpactColor(risk.impact)}`}>
                {risk.impact}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className={`px-2 py-0.5 rounded-full font-medium ${getStatusColor(risk.status)}`}>
                {risk.status}
              </span>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{risk.owner}</span>
                <span>{risk.updated}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
