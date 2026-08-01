import { motion } from 'framer-motion'
import { AlertTriangle, Diamond, Circle } from 'lucide-react'

interface TimelineRoadmapProps {
  data: any[]
  isLoading: boolean
}

const STATUS_LABELS: Record<string, string> = {
  assessment: 'Assessment',
  development: 'Development',
  uat: 'UAT / Testing',
  deployment: 'Deployment',
}

const STATUS_COLORS: Record<string, string> = {
  assessment: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
  development: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  uat: 'text-pink-600 bg-pink-100 dark:bg-pink-900/30',
  deployment: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30',
}

export function TimelineRoadmap({ data, isLoading }: TimelineRoadmapProps) {
  if (isLoading) {
    return (
      <div className="card h-[400px] animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  const formatDate = (date: any) => {
    if (!date) return 'TBD'
    return new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card h-[400px] flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Timeline / Roadmap Overview</h3>
        <button className="text-xs text-primary hover:underline">View full roadmap</button>
      </div>

      {!data || data.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
          No timeline data
        </div>
      ) : (
        <div className="space-y-3 overflow-auto flex-1">
          <div className="text-xs text-muted-foreground font-medium mb-2 grid grid-cols-12 px-2">
            <div className="col-span-5">Project / Milestone</div>
            <div className="col-span-7 text-right">Timeline</div>
          </div>

          {data.map((project, index) => (
            <motion.div
              key={project.ticketNumber}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="col-span-5">
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0">
                    {project.isAtRisk ? (
                      <AlertTriangle size={16} className="text-red-500" />
                    ) : project.milestone ? (
                      <Diamond size={16} className="text-green-500" fill="currentColor" />
                    ) : (
                      <Circle size={12} className={`${STATUS_COLORS[project.status]?.split(' ')[0] || 'text-gray-500'}`} fill="currentColor" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">
                      {project.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{project.ticketNumber}</p>
                  </div>
                </div>
              </div>

              <div className="col-span-7">
                {/* Timeline bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{formatDate(project.startDate)}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[project.status] || 'text-gray-600 bg-gray-100'}`}>
                      {STATUS_LABELS[project.status] || project.status}
                    </span>
                    <span className="text-muted-foreground">{formatDate(project.endDate)}</span>
                  </div>
                  
                  <div className="relative h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`absolute top-0 left-0 h-full rounded-full ${
                        project.isDelayed
                          ? 'bg-red-500'
                          : project.isAtRisk
                          ? 'bg-orange-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: '70%' }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Legend */}
          <div className="flex items-center gap-4 pt-3 mt-3 border-t text-xs">
            <div className="flex items-center gap-1">
              <Circle size={10} className="text-green-500" fill="currentColor" />
              <span className="text-muted-foreground">On Track</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle size={12} className="text-red-500" />
              <span className="text-muted-foreground">At Risk</span>
            </div>
            <div className="flex items-center gap-1">
              <Diamond size={12} className="text-green-500" fill="currentColor" />
              <span className="text-muted-foreground">Milestone</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
