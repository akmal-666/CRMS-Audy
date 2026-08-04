'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { 
  TrendingDown, Users, CheckCircle, XCircle, Clock, 
  DollarSign, Award, Building2, Loader2, ArrowUpRight 
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { motion } from 'framer-motion'

interface NegotiationStats {
  summary: {
    totalRequested: number
    totalApproved: number
    totalSaved: number
    savingsPercentage: number
    totalProjects: number
    negotiatedProjects: number
    negotiationRate: number
  }
  statusBreakdown: {
    accepted: number
    rejected: number
    pending: number
  }
  topNegotiators: Array<{
    id: string
    name: string
    saved: number
    count: number
  }>
  departmentStats: Array<{
    departmentId: string
    departmentName: string
    totalRequested: number
    totalSaved: number
    averageReduction: number
    projectCount: number
  }>
  recentNegotiations: Array<{
    workItemId: string
    ticketNumber: string
    title: string
    mandaysRequested: number
    mandaysNegotiated?: number | null
    mandaysApproved: number
    saved: number
    savingsPercentage: number
    negotiatedBy?: string | null
    negotiatedAt?: string | null
  }>
}

export function MandaysReportPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['negotiation-stats'],
    queryFn: () => apiGet<NegotiationStats>('/api/negotiations/stats/summary'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const stats = data?.data

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">No negotiation data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mandays Negotiation Report</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track mandays optimization and negotiation efficiency across all projects
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Negotiation Efficiency */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }} 
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950">
              <TrendingDown size={18} className="text-green-600" />
            </div>
            <span className="text-2xl font-bold text-green-600">
              {stats.summary.savingsPercentage.toFixed(1)}%
            </span>
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Negotiation Efficiency</h3>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Requested:</span>
              <span className="font-medium">{stats.summary.totalRequested} days</span>
            </div>
            <div className="flex justify-between">
              <span>Approved:</span>
              <span className="font-medium">{stats.summary.totalApproved} days</span>
            </div>
            <div className="flex justify-between text-green-600 font-semibold">
              <span>Saved:</span>
              <span>{stats.summary.totalSaved} days</span>
            </div>
          </div>
        </motion.div>

        {/* Negotiation Rate */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
              <DollarSign size={18} className="text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-blue-600">
              {stats.summary.negotiationRate.toFixed(1)}%
            </span>
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Projects Negotiated</h3>
          <p className="text-xs text-muted-foreground">
            {stats.summary.negotiatedProjects} out of {stats.summary.totalProjects} projects
          </p>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${stats.summary.negotiationRate}%` }}
            />
          </div>
        </motion.div>

        {/* Success Rate */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950">
              <CheckCircle size={18} className="text-amber-600" />
            </div>
            <span className="text-2xl font-bold text-amber-600">
              {stats.statusBreakdown.accepted}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Accepted Proposals</h3>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle size={12} className="text-green-600" />
              <span>Accepted: {stats.statusBreakdown.accepted}</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle size={12} className="text-red-600" />
              <span>Rejected: {stats.statusBreakdown.rejected}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={12} className="text-amber-600" />
              <span>Pending: {stats.statusBreakdown.pending}</span>
            </div>
          </div>
        </motion.div>

        {/* Average Reduction */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-950">
              <Award size={18} className="text-violet-600" />
            </div>
            <span className="text-2xl font-bold text-violet-600">
              {stats.summary.negotiatedProjects > 0 
                ? (stats.summary.totalSaved / stats.summary.negotiatedProjects).toFixed(1)
                : 0}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Avg. Reduction</h3>
          <p className="text-xs text-muted-foreground">
            Average mandays saved per negotiated project
          </p>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Negotiators */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Top Negotiators</h2>
          </div>
          {stats.topNegotiators.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No negotiations yet</p>
          ) : (
            <div className="space-y-2">
              {stats.topNegotiators.map((negotiator, index) => (
                <div 
                  key={negotiator.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors"
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
                    index === 0 ? 'bg-amber-100 dark:bg-amber-950 text-amber-600' :
                    index === 1 ? 'bg-slate-100 dark:bg-slate-800 text-slate-600' :
                    index === 2 ? 'bg-orange-100 dark:bg-orange-950 text-orange-600' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {negotiator.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {negotiator.count} projects
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">
                      -{negotiator.saved} days
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Department Performance */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card"
        >
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={16} className="text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Department Performance</h2>
          </div>
          {stats.departmentStats.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No department data</p>
          ) : (
            <div className="space-y-2">
              {stats.departmentStats.map((dept) => (
                <div 
                  key={dept.departmentId}
                  className="p-3 rounded-lg border border-border bg-background"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {dept.departmentName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dept.projectCount} projects
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">
                        {dept.averageReduction.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        -{dept.totalSaved} days
                      </p>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-600 rounded-full transition-all"
                      style={{ width: `${Math.min(dept.averageReduction, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Negotiations Table */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <h2 className="text-base font-semibold text-foreground mb-4">Recent Negotiations</h2>
        {stats.recentNegotiations.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No recent negotiations</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground">
                  <th className="pb-2 pr-4">CR Number</th>
                  <th className="pb-2 pr-4">Title</th>
                  <th className="pb-2 pr-4 text-right">Requested</th>
                  <th className="pb-2 pr-4 text-right">Negotiated</th>
                  <th className="pb-2 pr-4 text-right">Final</th>
                  <th className="pb-2 pr-4 text-right">Saved</th>
                  <th className="pb-2 pr-4">Negotiator</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentNegotiations.map((neg) => (
                  <tr 
                    key={neg.workItemId}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <a 
                        href={`/requests/${neg.workItemId}`}
                        className="text-sm font-mono text-primary hover:underline font-medium"
                      >
                        {neg.ticketNumber}
                      </a>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-sm text-foreground truncate max-w-xs">
                        {neg.title}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-right text-sm text-muted-foreground">
                      {neg.mandaysRequested}d
                    </td>
                    <td className="py-3 pr-4 text-right text-sm text-amber-600 font-medium">
                      {neg.mandaysNegotiated ? `${neg.mandaysNegotiated}d` : '-'}
                    </td>
                    <td className="py-3 pr-4 text-right text-sm text-foreground font-semibold">
                      {neg.mandaysApproved}d
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {neg.saved > 0 ? (
                        <span className="text-sm font-semibold text-green-600">
                          {neg.saved}d ({neg.savingsPercentage.toFixed(0)}%)
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-sm text-muted-foreground">
                      {neg.negotiatedBy || '-'}
                    </td>
                    <td className="py-3 text-sm text-muted-foreground">
                      {neg.negotiatedAt ? formatDate(neg.negotiatedAt) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}
