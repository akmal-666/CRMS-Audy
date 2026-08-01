'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface ProjectProgressListProps {
  data: any[]
  isLoading: boolean
}

const STATUS_COLORS: Record<string, string> = {
  assessment: 'bg-amber-500',
  development: 'bg-purple-500',
  uat: 'bg-pink-500',
  deployment: 'bg-teal-500',
}

export function ProjectProgressList({ data, isLoading }: ProjectProgressListProps) {
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="card h-[400px] animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card h-[400px] flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Project Progress (Top 5)</h3>
        <button 
          onClick={() => router.push('/requests')}
          className="text-xs text-primary hover:underline font-medium transition-colors"
        >
          View all projects
        </button>
      </div>
      
      {!data || data.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
          No active projects
        </div>
      ) : (
        <div className="space-y-4 overflow-auto flex-1">
          {data.map((project, index) => (
            <motion.div
              key={project.ticketNumber}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {project.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{project.ticketNumber}</p>
                </div>
                <span className="text-sm font-semibold text-foreground ml-2">
                  {project.progress}%
                </span>
              </div>
              
              <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${project.progress}%` }}
                  transition={{ duration: 0.6, delay: index * 0.05 }}
                  className={`absolute top-0 left-0 h-full rounded-full ${STATUS_COLORS[project.status] || 'bg-blue-500'}`}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
