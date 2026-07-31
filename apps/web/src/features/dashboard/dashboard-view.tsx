'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, CheckCircle2, AlertCircle, 
  Clock, Target, Download, Calendar, Users, ArrowRight,
  Folder, CheckSquare, Flag,
} from 'lucide-react'
import { apiGet } from '@/lib/api'
import { WorkflowStatus } from '@crms/types'
import { STATUS_LABELS, STATUS_COLORS, formatDate, cn, timeAgo } from '@/lib/utils'

interface DashboardStats {
  total: number
  byStatus: Record<string, number>
  byPriority: Record<string, number>
  overdue: number
  recentItems: Array<{
    id: string
    ticketNumber: string
    title: string
    status: string
    priority: string
    createdAt: string
    dueDate?: string
    department?: { name: string }
    manager?: { name: string; avatarUrl?: string }
    developer?: { name: string; avatarUrl?: string }
  }>
  monthlyTrend: Array<{ month: string; count: number }>
}

export function DashboardView() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiGet<DashboardStats>('/api/dashboard/stats'),
    refetchInterval: 30000,
  })

  const stats = data?.data

  if (isLoading) return <DashboardSkeleton />

  const totalProjects = stats?.total ?? 0
  const activeTasks = (stats?.byStatus['development'] ?? 0) + (stats?.byStatus['uat'] ?? 0) + (stats?.byStatus['deployment'] ?? 0)
  const completedMilestones = stats?.byStatus['go_live'] ?? 0
  const portfolioProgress = totalProjects > 0 ? Math.round((completedMilestones / totalProjects) * 100) : 0

  // Calculate trends (simplified - comparing last month)
  const currentMonthCount = stats?.monthlyTrend?.[stats.monthlyTrend.length - 1]?.count ?? 0
  const lastMonthCount = stats?.monthlyTrend?.[stats.monthlyTrend.length - 2]?.count ?? 0
  const projectsTrend = lastMonthCount > 0 ? Math.round(((currentMonthCount - lastMonthCount) / lastMonthCount) * 100) : 0

  // Get ongoing projects (in progress statuses)
  const ongoingProjects = stats?.recentItems?.filter(item => 
    ['development', 'uat', 'deployment'].includes(item.status)
  ).slice(0, 3) ?? []

  // Get upcoming deadlines
  const upcomingDeadlines = stats?.recentItems
    ?.filter(item => item.dueDate && new Date(item.dueDate) > new Date())
    ?.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    ?.slice(0, 3) ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back. Here is the current status of your portfolio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost flex items-center gap-2 text-sm">
            <Calendar size={14} />
            This Week
          </button>
          <button className="btn-ghost flex items-center gap-2 text-sm">
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={<Folder size={20} />}
          iconBg="bg-blue-50 text-blue-600"
          title="Total Projects"
          value={totalProjects}
          trend={projectsTrend}
          trendLabel="12%"
          delay={0}
        />
        <StatsCard
          icon={<CheckSquare size={20} />}
          iconBg="bg-purple-50 text-purple-600"
          title="Active Tasks"
          value={activeTasks}
          trend={0}
          trendLabel="0%"
          delay={0.05}
        />
        <StatsCard
          icon={<Flag size={20} />}
          iconBg="bg-green-50 text-green-600"
          title="Completed Milestones"
          value={completedMilestones}
          trend={5}
          trendLabel="5%"
          delay={0.1}
        />
        <ProgressCard
          value={portfolioProgress}
          delay={0.15}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Ongoing Projects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Ongoing Projects</h2>
            <Link href="/requests" className="text-sm text-primary hover:underline flex items-center gap-1">
              View All
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="space-y-3">
            {ongoingProjects.map((project, i) => (
              <ProjectCard key={project.id} project={project} delay={i * 0.05} />
            ))}
            {ongoingProjects.length === 0 && (
              <div className="card text-center py-8 text-muted-foreground text-sm">
                No ongoing projects
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Upcoming Deadlines */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Upcoming Deadlines</h3>
              <button className="text-muted-foreground hover:text-foreground">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              {upcomingDeadlines.map((item, i) => (
                <DeadlineItem key={item.id} item={item} delay={i * 0.05} />
              ))}
              {upcomingDeadlines.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No upcoming deadlines</p>
              )}
              {upcomingDeadlines.length > 0 && (
                <Link href="/requests/calendar" className="block text-center text-sm text-primary hover:underline pt-2">
                  View Calendar
                </Link>
              )}
            </div>
          </div>

          {/* Team Workload - Placeholder */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Team Workload</h3>
              <button className="text-muted-foreground hover:text-foreground">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <WorkloadItem name="Developers" tasks={activeTasks} progress={75} delay={0} />
              <WorkloadItem name="QA Team" tasks={stats?.byStatus['uat'] ?? 0} progress={45} delay={0.05} />
              <WorkloadItem name="Managers" tasks={stats?.byStatus['assessment'] ?? 0} progress={30} delay={0.1} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatsCard({ icon, iconBg, title, value, trend, trendLabel, delay }: {
  icon: React.ReactNode
  iconBg: string
  title: string
  value: number
  trend: number
  trendLabel: string
  delay: number
}) {
  const isPositive = trend >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="card"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}>
          {icon}
        </div>
        <div className={cn('flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded', 
          isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
        )}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {trendLabel}
        </div>
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-0.5">{title}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </motion.div>
  )
}

function ProgressCard({ value, delay }: { value: number; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="card bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
      <div className="relative">
        <Target size={20} className="mb-3 opacity-80" />
        <p className="text-sm opacity-80 mb-1">Portfolio Progress</p>
        <p className="text-3xl font-bold">{value}%</p>
        <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ delay: delay + 0.3, duration: 0.8 }}
            className="h-full bg-white rounded-full"
          />
        </div>
      </div>
    </motion.div>
  )
}

function ProjectCard({ project, delay }: { project: any; delay: number }) {
  const progress = Math.floor(Math.random() * 60) + 20 // Mock progress
  const statusBadgeMap: Record<string, { label: string; color: string }> = {
    development: { label: 'On Track', color: 'bg-blue-100 text-blue-700' },
    uat: { label: 'Testing', color: 'bg-amber-100 text-amber-700' },
    deployment: { label: 'Deploying', color: 'bg-green-100 text-green-700' },
  }
  const statusBadge = statusBadgeMap[project.status] || { label: 'In Progress', color: 'bg-gray-100 text-gray-700' }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="card hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <Link href={`/requests/${project.id}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate block">
            {project.title}
          </Link>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{project.ticketNumber}</p>
        </div>
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2', statusBadge.color)}>
          {statusBadge.label}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-muted-foreground">Progress</span>
        <span className="font-medium text-foreground">{progress}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ delay: delay + 0.2, duration: 0.6 }}
          className="h-full bg-primary rounded-full"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {project.manager && (
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
              {project.manager.name.charAt(0)}
            </div>
          )}
          {project.developer && (
            <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-xs font-medium text-violet-700">
              {project.developer.name.charAt(0)}
            </div>
          )}
        </div>
        {project.dueDate && (
          <span className="text-xs text-muted-foreground">Due: {formatDate(project.dueDate)}</span>
        )}
      </div>
    </motion.div>
  )
}

function DeadlineItem({ item, delay }: { item: any; delay: number }) {
  const dueDate = new Date(item.dueDate!)
  const month = dueDate.toLocaleString('en', { month: 'short' }).toUpperCase()
  const day = dueDate.getDate()

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex items-start gap-3"
    >
      <div className="flex-shrink-0 w-10 text-center">
        <div className="text-xs font-medium text-primary">{month}</div>
        <div className="text-lg font-bold text-foreground">{day}</div>
      </div>
      <div className="flex-1 min-w-0">
        <Link href={`/requests/${item.id}`} className="text-sm font-medium text-foreground hover:text-primary truncate block">
          {item.title}
        </Link>
        <p className="text-xs text-muted-foreground truncate">{item.department?.name}</p>
      </div>
    </motion.div>
  )
}

function WorkloadItem({ name, tasks, progress, delay }: {
  name: string
  tasks: number
  progress: number
  delay: number
}) {
  const statusColor = progress > 70 ? 'bg-green-500' : progress > 40 ? 'bg-amber-500' : 'bg-gray-400'

  return (
    <motion.div
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="space-y-1.5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
            <Users size={12} className="text-muted-foreground" />
          </div>
          <span className="text-sm text-foreground">{name}</span>
        </div>
        <span className="text-xs text-muted-foreground">{tasks} Tasks</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ delay: delay + 0.2, duration: 0.6 }}
          className={cn('h-full rounded-full', statusColor)}
        />
      </div>
    </motion.div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-muted rounded w-64" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="card h-32 bg-muted" />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="card h-32 bg-muted" />)}
        </div>
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <div key={i} className="card h-48 bg-muted" />)}
        </div>
      </div>
    </div>
  )
}
