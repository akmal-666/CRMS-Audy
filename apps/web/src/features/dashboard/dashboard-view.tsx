'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  TrendingUp, Clock, CheckCircle2, AlertCircle, Code2,
  TestTube2, Rocket, XCircle, Inbox, BarChart3,
} from 'lucide-react'
import { apiGet } from '@/lib/api'
import { WorkflowStatus } from '@crms/types'
import { STATUS_LABELS, STATUS_COLORS, formatDate, cn } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

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
    department?: { name: string }
  }>
  monthlyTrend: Array<{ month: string; count: number }>
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  in_pipeline: <Inbox size={18} />,
  assessment: <BarChart3 size={18} />,
  development: <Code2 size={18} />,
  uat: <TestTube2 size={18} />,
  deployment: <Rocket size={18} />,
  go_live: <CheckCircle2 size={18} />,
  drop: <XCircle size={18} />,
}

const STATUS_BG_COLORS: Record<string, string> = {
  in_pipeline: 'bg-slate-500',
  assessment: 'bg-blue-500',
  development: 'bg-violet-500',
  uat: 'bg-amber-500',
  deployment: 'bg-orange-500',
  go_live: 'bg-green-500',
  drop: 'bg-red-500',
}

const CHART_COLORS = ['#4F46E5', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899']

export function DashboardView() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiGet<DashboardStats>('/api/dashboard/stats'),
    refetchInterval: 30000,
  })

  const stats = data?.data

  if (isLoading) return <DashboardSkeleton />

  const statusCards = [
    WorkflowStatus.IN_PIPELINE,
    WorkflowStatus.ASSESSMENT,
    WorkflowStatus.DEVELOPMENT,
    WorkflowStatus.UAT,
    WorkflowStatus.DEPLOYMENT,
    WorkflowStatus.GO_LIVE,
    WorkflowStatus.DROP,
  ]

  const pieData = statusCards.map((s, i) => ({
    name: STATUS_LABELS[s],
    value: stats?.byStatus[s] ?? 0,
    color: CHART_COLORS[i],
  })).filter(d => d.value > 0)

  const barData = stats?.monthlyTrend?.map(m => ({
    month: m.month,
    requests: m.count,
  })) ?? []

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Overview of all change requests</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          title="Total Requests"
          value={stats?.total ?? 0}
          icon={<TrendingUp size={18} />}
          iconBg="bg-primary/10 text-primary"
          delay={0}
        />
        <SummaryCard
          title="In Progress"
          value={(stats?.byStatus['development'] ?? 0) + (stats?.byStatus['uat'] ?? 0)}
          icon={<Code2 size={18} />}
          iconBg="bg-violet-100 text-violet-600"
          delay={0.05}
        />
        <SummaryCard
          title="Go Live"
          value={stats?.byStatus['go_live'] ?? 0}
          icon={<CheckCircle2 size={18} />}
          iconBg="bg-green-100 text-green-600"
          delay={0.1}
        />
        <SummaryCard
          title="Overdue"
          value={stats?.overdue ?? 0}
          icon={<AlertCircle size={18} />}
          iconBg="bg-red-100 text-red-600"
          delay={0.15}
        />
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {statusCards.map((status, i) => (
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="card text-center py-3 px-2"
          >
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 text-white', STATUS_BG_COLORS[status])}>
              {STATUS_ICONS[status]}
            </div>
            <div className="text-xl font-bold text-foreground">{stats?.byStatus[status] ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{STATUS_LABELS[status]}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Monthly trend */}
        <div className="card lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Requests</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgb(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'rgb(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid rgb(var(--border))', fontSize: 12, background: 'rgb(var(--card))' }} />
              <Bar dataKey="requests" fill="#4F46E5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status pie */}
        <div className="card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Status Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" outerRadius={70} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Recent requests */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Recent Requests</h3>
          <a href="/requests" className="text-xs text-primary hover:underline">View all</a>
        </div>
        <div className="space-y-2">
          {stats?.recentItems?.map((item, i) => (
            <motion.a
              key={item.id}
              href={`/requests/${item.id}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <span className="text-xs font-mono text-muted-foreground w-28 flex-shrink-0">{item.ticketNumber}</span>
              <span className="text-sm text-foreground flex-1 truncate">{item.title}</span>
              <span className="text-xs text-muted-foreground hidden sm:block">{item.department?.name}</span>
              <span className={cn('badge text-xs', STATUS_COLORS[item.status as WorkflowStatus])}>{STATUS_LABELS[item.status as WorkflowStatus]}</span>
              <span className="text-xs text-muted-foreground hidden md:block">{formatDate(item.createdAt)}</span>
            </motion.a>
          ))}
          {!stats?.recentItems?.length && (
            <p className="text-sm text-muted-foreground text-center py-6">No requests yet</p>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ title, value, icon, iconBg, delay }: {
  title: string; value: number; icon: React.ReactNode; iconBg: string; delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="card flex items-center gap-3"
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground">{value.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground">{title}</div>
      </div>
    </motion.div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-6 bg-muted rounded w-40" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="card h-20 bg-muted" />)}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {[...Array(7)].map((_, i) => <div key={i} className="card h-24 bg-muted" />)}
      </div>
    </div>
  )
}
