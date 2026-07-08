'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { apiGet } from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'
import { WorkflowStatus } from '@crms/types'
import { STATUS_LABELS } from '@/lib/utils'

const COLORS = ['#4F46E5', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899']

export default function ReportsPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiGet<any>('/api/dashboard/stats'),
  })

  const { data: deptData } = useQuery({
    queryKey: ['dept-breakdown'],
    queryFn: () => apiGet<any[]>('/api/dashboard/department-breakdown'),
  })

  const { data: devData } = useQuery({
    queryKey: ['dev-workload'],
    queryFn: () => apiGet<any[]>('/api/dashboard/developer-workload'),
  })

  const statusData = stats?.data?.byStatus
    ? Object.entries(stats.data.byStatus as Record<string, number>).map(([k, v]) => ({
        name: STATUS_LABELS[k as WorkflowStatus] ?? k,
        value: v,
      }))
    : []

  const monthlyData = stats?.data?.monthlyTrend ?? []
  const departments = (deptData?.data as any[]) ?? []
  const developers = (devData?.data as any[]) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Insights into change request performance</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Monthly trend */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Requests (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData.map((m: any) => ({ month: m.month, requests: m.count }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="requests" fill="#4F46E5" radius={[4, 4, 0, 0]} name="Requests" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Status distribution */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} cx="40%" cy="50%" outerRadius={80} dataKey="value" nameKey="name">
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Department breakdown */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Requests by Department</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={departments} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="department" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} name="Requests" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Developer workload */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Developer Workload</h3>
          {developers.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={developers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="developer" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#22C55E" radius={[0, 4, 4, 0]} name="Active Items" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No active assignments</div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
