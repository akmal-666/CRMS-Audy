import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react'

interface ProjectHealthTableProps {
  data: any[]
  isLoading: boolean
}

const HEALTH_CONFIG = {
  good: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-100 dark:bg-green-900/30',
    label: 'Good',
  },
  'at-risk': {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    label: 'At Risk',
  },
  critical: {
    icon: AlertCircle,
    color: 'text-red-600',
    bg: 'bg-red-100 dark:bg-red-900/30',
    label: 'Critical',
  },
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-red-600',
  high: 'text-orange-600',
  medium: 'text-blue-600',
  low: 'text-gray-600',
}

export function ProjectHealthTable({ data, isLoading }: ProjectHealthTableProps) {
  if (isLoading) {
    return (
      <div className="card h-[500px] animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="card h-[500px] flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Projects Health Summary</h3>
        <button className="text-xs text-primary hover:underline">View all projects</button>
      </div>

      {!data || data.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
          No project health data
        </div>
      ) : (
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
              <tr className="border-b">
                <th className="text-left p-2 font-medium text-muted-foreground">Project</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Progress</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Status</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Health</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Priority</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Issues</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Avg Cycle Time</th>
                <th className="text-center p-2 font-medium text-muted-foreground">SLA</th>
              </tr>
            </thead>
            <tbody>
              {data.map((project, index) => {
                const healthConfig = HEALTH_CONFIG[project.health as keyof typeof HEALTH_CONFIG]
                const HealthIcon = healthConfig.icon

                return (
                  <motion.tr
                    key={project.ticketNumber}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-2">
                      <div>
                        <p className="font-medium text-foreground truncate max-w-[200px]">
                          {project.name}
                        </p>
                        <p className="text-muted-foreground">{project.ticketNumber}</p>
                      </div>
                    </td>

                    <td className="p-2">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-full max-w-[60px] h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground">{project.progress}%</span>
                      </div>
                    </td>

                    <td className="p-2 text-center">
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {project.status}
                      </span>
                    </td>

                    <td className="p-2">
                      <div className="flex items-center justify-center gap-1">
                        <div className={`${healthConfig.bg} p-1.5 rounded-full`}>
                          <HealthIcon size={12} className={healthConfig.color} />
                        </div>
                        <span className={`font-medium ${healthConfig.color}`}>
                          {healthConfig.label}
                        </span>
                      </div>
                    </td>

                    <td className="p-2 text-center">
                      <span className={`font-medium capitalize ${PRIORITY_COLORS[project.priority]}`}>
                        {project.priority}
                      </span>
                    </td>

                    <td className="p-2">
                      <div className="flex items-center justify-center gap-1 text-xs">
                        <span className="text-red-600">{project.openIssues}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-amber-600">{project.inProgressIssues}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-green-600">{project.doneIssues}</span>
                      </div>
                    </td>

                    <td className="p-2 text-center">
                      <span className="font-medium text-foreground">{project.avgCycleTime} days</span>
                    </td>

                    <td className="p-2 text-center">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          project.sla === 'on-time'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {project.sla === 'on-time' ? 'On Time' : 'Overdue'}
                      </span>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  )
}
