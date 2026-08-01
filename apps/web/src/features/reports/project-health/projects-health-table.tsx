import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, AlertTriangle, Minus } from 'lucide-react'
import { useState } from 'react'

interface ProjectsHealthTableProps {
  data: any[]
  isLoading: boolean
}

const STATUS_ICONS: Record<string, any> = {
  'on-track': CheckCircle2,
  'delayed': AlertCircle,
  'at-risk': AlertTriangle,
}

const STATUS_COLORS: Record<string, string> = {
  'on-track': 'text-green-600 bg-green-100 dark:bg-green-900/30',
  'delayed': 'text-red-600 bg-red-100 dark:bg-red-900/30',
  'at-risk': 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
}

const RISK_COLORS: Record<string, string> = {
  low: 'text-green-600',
  medium: 'text-amber-600',
  high: 'text-red-600',
  critical: 'text-red-700',
}

export function ProjectsHealthTable({ data, isLoading }: ProjectsHealthTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8
  
  if (isLoading) {
    return (
      <div className="card h-[600px] animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="card h-[600px] flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No projects found</p>
      </div>
    )
  }

  const totalPages = Math.ceil(data.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = data.slice(startIndex, startIndex + itemsPerPage)

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100 dark:bg-green-900/30'
    if (score >= 60) return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
    if (score >= 40) return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30'
    return 'text-red-600 bg-red-100 dark:bg-red-900/30'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'assessment': 'Assessment',
      'development': 'Development',
      'uat': 'UAT',
      'deployment': 'Deployment',
    }
    return labels[status] || status
  }

  const getHealthStatus = (healthScore: number) => {
    if (healthScore >= 80) return 'on-track'
    if (healthScore >= 60) return 'at-risk'
    return 'delayed'
  }

  return (
    <div className="card h-[600px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Projects Health Overview</h3>
        <p className="text-xs text-muted-foreground">
          1-{Math.min(itemsPerPage, data.length)} of {data.length} projects
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
            <tr className="border-b">
              <th className="text-left p-2 font-medium text-muted-foreground w-[200px]">Project</th>
              <th className="text-center p-2 font-medium text-muted-foreground">Health</th>
              <th className="text-center p-2 font-medium text-muted-foreground">Status</th>
              <th className="text-center p-2 font-medium text-muted-foreground">Progress</th>
              <th className="text-center p-2 font-medium text-muted-foreground">Trend</th>
              <th className="text-center p-2 font-medium text-muted-foreground">Risk</th>
              <th className="text-right p-2 font-medium text-muted-foreground">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((project, index) => {
              const healthStatus = getHealthStatus(project.healthScore)
              const StatusIcon = STATUS_ICONS[healthStatus]
              const timeAgo = project.daysElapsed ? `${project.daysElapsed}d ago` : '-'

              return (
                <motion.tr
                  key={project.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="border-b hover:bg-muted/30 transition-colors"
                >
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {project.title.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{project.title}</p>
                        <p className="text-muted-foreground">{project.ticketNumber}</p>
                      </div>
                    </div>
                  </td>

                  <td className="p-2">
                    <div className="flex items-center justify-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getHealthColor(project.healthScore)}`}>
                        {project.healthScore}%
                      </span>
                    </div>
                  </td>

                  <td className="p-2">
                    <div className="flex items-center justify-center">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${STATUS_COLORS[healthStatus]}`}>
                        <StatusIcon size={12} />
                        <span className="text-xs font-medium capitalize">
                          {getStatusLabel(project.status)}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="p-2">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-foreground">{project.progress}%</span>
                      <div className="w-full max-w-[80px] h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="p-2 text-center">
                    {project.progress > 50 ? (
                      <TrendingUp size={16} className="inline text-green-600" />
                    ) : project.progress > 20 ? (
                      <Minus size={16} className="inline text-gray-600" />
                    ) : (
                      <TrendingDown size={16} className="inline text-red-600" />
                    )}
                  </td>

                  <td className="p-2 text-center">
                    <span className={`text-xs font-medium capitalize ${RISK_COLORS[project.risk || 'low']}`}>
                      {project.risk || 'Low'}
                    </span>
                  </td>

                  <td className="p-2 text-right">
                    <span className="text-xs text-muted-foreground">{timeAgo}</span>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-xs border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 text-xs border rounded hover:bg-muted ${
                currentPage === page ? 'bg-primary text-white border-primary' : ''
              }`}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-xs border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
