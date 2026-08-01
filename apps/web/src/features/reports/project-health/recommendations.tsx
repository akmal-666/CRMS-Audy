import { motion } from 'framer-motion'
import { Lightbulb, ExternalLink } from 'lucide-react'

interface RecommendationsProps {
  data: any[]
  isLoading: boolean
}

export function Recommendations({ data, isLoading }: RecommendationsProps) {
  if (isLoading) {
    return (
      <div className="card h-[350px] animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  const recommendations = data || [
    {
      title: 'Mobile App project is behind schedule by 12 days',
      description: 'Consider re-allocating resources to avoid further delay',
      action: 'View',
    },
    {
      title: 'Data Warehouse has high risk due to resource constraint',
      description: 'Add more developer resources to avoid further delay',
      action: 'View',
    },
    {
      title: 'CRM Integration dependency on Odoo Implementation',
      description: 'Coordinate with Odoo team to unblock the dependency',
      action: 'View',
    },
  ]

  return (
    <div className="card h-[350px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Recommendations</h3>
        <button className="text-xs text-primary hover:underline">View all recommendations</button>
      </div>

      <div className="flex-1 overflow-auto space-y-3">
        {recommendations.map((rec, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
          >
            <div className="flex items-start gap-2 mb-2">
              <Lightbulb size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground mb-1">{rec.title}</p>
                <p className="text-xs text-muted-foreground">{rec.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button className="text-xs text-primary hover:underline flex items-center gap-1">
                {rec.action}
                <ExternalLink size={12} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
