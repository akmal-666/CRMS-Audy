'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, ChevronUp, ChevronDown } from 'lucide-react'

interface MandaysByProjectTableProps {
  data: any[]
  isLoading: boolean
}

type SortKey = 'actual' | 'variance' | 'utilizationPercent'
type SortDir = 'asc' | 'desc'

const STATUS_LABELS: Record<string, string> = {
  in_pipeline: 'In Pipeline',
  assessment: 'Assessment',
  development: 'Development',
  uat: 'UAT',
  deployment: 'Deployment',
  go_live: 'Go Live',
  drop: 'Dropped',
}

export function MandaysByProjectTable({ data, isLoading }: MandaysByProjectTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('actual')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)
  const perPage = 10

  if (isLoading) {
    return (
      <div className="card h-[400px] animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  const sorted = [...(data || [])].sort((a, b) => {
    const valA = a[sortKey] ?? 0
    const valB = b[sortKey] ?? 0
    return sortDir === 'asc' ? valA - valB : valB - valA
  })

  const paged = sorted.slice(page * perPage, (page + 1) * perPage)
  const totalPages = Math.ceil((data?.length || 0) / perPage)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronUp size={12} className="opacity-30" />
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  const VarianceIcon = ({ v }: { v: number }) => {
    if (Math.abs(v) < 0.5) return <Minus size={12} className="text-gray-500" />
    return v > 0 
      ? <TrendingUp size={12} className="text-red-500" /> 
      : <TrendingDown size={12} className="text-green-500" />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Mandays Detail (All Projects)</h3>
        <span className="text-xs text-muted-foreground">{data?.length || 0} projects</span>
      </div>

      {!paged || paged.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
          No mandays data available
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="text-left p-2 font-medium text-muted-foreground">Project</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Vendor</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Developer</th>
                  <th className="text-center p-2 font-medium text-muted-foreground">Status</th>
                  <th
                    className="text-right p-2 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground"
                    onClick={() => toggleSort('actual')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Actual MD <SortIcon k="actual" />
                    </div>
                  </th>
                  <th
                    className="text-right p-2 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground"
                    onClick={() => toggleSort('variance')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Variance <SortIcon k="variance" />
                    </div>
                  </th>
                  <th
                    className="text-right p-2 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground"
                    onClick={() => toggleSort('utilizationPercent')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Used % <SortIcon k="utilizationPercent" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.map((project, index) => (
                  <tr key={project.ticketNumber} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-2">
                      <p className="font-medium text-foreground truncate max-w-[200px]">{project.title}</p>
                      <p className="text-muted-foreground">{project.ticketNumber}</p>
                    </td>
                    <td className="p-2 text-muted-foreground">{project.vendor || '—'}</td>
                    <td className="p-2 text-muted-foreground">{project.developer || '—'}</td>
                    <td className="p-2 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {STATUS_LABELS[project.status] || project.status}
                      </span>
                    </td>
                    <td className="p-2 text-right font-semibold text-foreground">
                      {project.actual > 0 ? `${project.actual} MD` : '—'}
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <VarianceIcon v={project.variance} />
                        <span className={
                          project.variance > 0.5 ? 'text-red-600 font-medium' :
                          project.variance < -0.5 ? 'text-green-600 font-medium' :
                          'text-muted-foreground'
                        }>
                          {project.variance > 0 ? '+' : ''}{project.variance.toFixed(1)} MD
                        </span>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              project.utilizationPercent > 110 ? 'bg-red-500' :
                              project.utilizationPercent > 90 ? 'bg-amber-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(project.utilizationPercent, 100)}%` }}
                          />
                        </div>
                        <span className={`font-medium ${
                          project.utilizationPercent > 110 ? 'text-red-600' :
                          project.utilizationPercent > 90 ? 'text-amber-600' :
                          'text-green-600'
                        }`}>
                          {project.utilizationPercent}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-xs">
              <span className="text-muted-foreground">
                Showing {page * perPage + 1}–{Math.min((page + 1) * perPage, data?.length || 0)} of {data?.length || 0}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-muted transition-colors"
                >
                  Prev
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`w-7 h-7 rounded border text-xs transition-colors ${
                      i === page ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-muted transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  )
}
