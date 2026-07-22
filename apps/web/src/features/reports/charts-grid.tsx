import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Area, AreaChart,
} from 'recharts'
import { WorkflowStatus, Priority } from '@crms/types'
import { STATUS_LABELS, PRIORITY_LABELS } from '@/lib/utils'
import { TrendingUp, Users } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  in_pipeline: '#64748B',
  assessment: '#3B82F6',
  development: '#8B5CF6',
  uat: '#F59E0B',
  deployment: '#F97316',
  go_live: '#22C55E',
  drop: '#EF4444',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#22C55E',
  medium: '#F59E0B',
  high: '#F97316',
  critical: '#EF4444',
}

interface ChartsGridProps {
  data: any
  isLoading: boolean
}

export function ChartsGrid({ data, isLoading }: ChartsGridProps) {
  if (isLoading || !data) {
    return (
      <div className="grid lg:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-64 bg-muted rounded" />
          </div>
        ))}
      </div>
    )
  }

  const { byStatus, byPriority, byDepartment, byVendor, monthlyTrend, developerStats } = data

  const statusChartData = Object.entries(byStatus || {}).map(([status, count]) => ({
    name: STATUS_LABELS[status as WorkflowStatus] || status,
    value: count as number,
    color: STATUS_COLORS[status] || '#94A3B8',
  }))

  const priorityChartData = Object.entries(byPriority || {}).map(([priority, count]) => ({
    name: PRIORITY_LABELS[priority as Priority] || priority,
    value: count as number,
    color: PRIORITY_COLORS[priority] || '#94A3B8',
  }))

  const departmentChartData = Object.entries(byDepartment || {})
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([dept, count]) => ({ department: dept, count }))

  const vendorChartData = Object.entries(byVendor || {})
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([vendor, count]) => ({ vendor, count }))

  const developerChartData = Object.entries(developerStats || {})
    .sort(([, a]: any, [, b]: any) => b.total - a.total)
    .slice(0, 10)
    .map(([name, stats]: any) => ({ name, ...stats }))

  return (
    <>
      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Monthly Trend */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            Monthly Trend (Last 12 Months)
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyTrend || []}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #E5E7EB' }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" name="Total Requests" />
              <Area type="monotone" dataKey="completed" stroke="#22C55E" strokeWidth={2} fillOpacity={1} fill="url(#colorCompleted)" name="Completed" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Status Distribution */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={statusChartData}
                cx="38%"
                cy="50%"
                outerRadius={90}
                dataKey="value"
                nameKey="name"
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {statusChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 11, paddingLeft: 20 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Priority Distribution */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Priority Breakdown</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={priorityChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Requests">
                {priorityChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Department Breakdown */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Top 10 Departments</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={departmentChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="department" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#8B5CF6" radius={[0, 6, 6, 0]} name="Requests" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Charts Row 3 */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Vendor Breakdown */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Top 10 Platforms/Vendors</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={vendorChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="vendor" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#06B6D4" radius={[0, 6, 6, 0]} name="Requests" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Developer Performance */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users size={16} className="text-primary" />
            Developer Performance (Top 10)
          </h3>
          {developerChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={developerChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="completed" fill="#22C55E" radius={[0, 6, 6, 0]} name="Completed" stackId="a" />
                <Bar dataKey="inProgress" fill="#F59E0B" radius={[0, 6, 6, 0]} name="In Progress" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-60 text-muted-foreground text-sm">No developer assignments in this period</div>
          )}
        </motion.div>
      </div>
    </>
  )
}
