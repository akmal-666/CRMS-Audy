'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { apiGet } from '@/lib/api'
import { exportToCSV } from '@/lib/utils'
import { Download, BarChart3, FilterIcon, Star, TrendingUp, Clock, Users } from 'lucide-react'
import Link from 'next/link'
import { ReportFilters } from './report-filters'
import { KPICards } from './kpi-cards'
import { ChartsGrid } from './charts-grid'

export function ReportsPage() {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const currentQuarter = Math.ceil(currentMonth / 3)

  const [filterType, setFilterType] = useState<'year' | 'quarter' | 'month' | 'custom'>('year')
  const [year, setYear] = useState(currentYear.toString())
  const [quarter, setQuarter] = useState(currentQuarter.toString())
  const [month, setMonth] = useState(currentMonth.toString())
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [vendorId, setVendorId] = useState('')

  const queryParams = useMemo(() => {
    const params: any = {}
    if (departmentId) params.departmentId = departmentId
    if (vendorId) params.vendorId = vendorId
    
    if (filterType === 'custom' && startDate && endDate) {
      params.startDate = startDate
      params.endDate = endDate
    } else if (filterType === 'quarter') {
      params.year = year
      params.quarter = quarter
    } else if (filterType === 'month') {
      params.year = year
      params.month = month
    } else {
      params.year = year
    }
    return params
  }, [filterType, year, quarter, month, startDate, endDate, departmentId, vendorId])

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['reports', queryParams],
    queryFn: () => apiGet<any>('/api/reports', queryParams),
    select: (res) => res.data,
  })

  const handleExport = () => {
    const summary = reportData?.summary || {}
    const csvData = [
      { Metric: 'Total Requests', Value: summary.totalRequests },
      { Metric: 'Completed', Value: summary.completedRequests },
      { Metric: 'Avg Cycle Time (days)', Value: summary.avgCycleTimeDays },
      { Metric: 'SLA Compliance (%)', Value: summary.slaCompliance },
    ]
    exportToCSV(csvData, `report_${new Date().toISOString().split('T')[0]}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <BarChart3 size={22} className="text-primary" />
            Reports & Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Comprehensive insights and performance metrics
          </p>
        </div>
        <button onClick={handleExport} className="btn-primary flex items-center gap-2 text-sm">
          <Download size={14} />
          Export Report
        </button>
      </div>

      {/* Report Modules Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/reports/executive-overview">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="card bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800 cursor-pointer h-full"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-amber-500/20">
                <Star size={24} className="text-amber-600 dark:text-amber-400" fill="currentColor" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-700 dark:text-amber-300">Executive Overview</h3>
                <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">
                  High-level portfolio summary
                </p>
              </div>
            </div>
          </motion.div>
        </Link>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 cursor-pointer h-full opacity-60"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <TrendingUp size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-700 dark:text-blue-300">Project Health</h3>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">
                Coming soon
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800 cursor-pointer h-full opacity-60"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-purple-500/20">
              <Clock size={24} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-purple-700 dark:text-purple-300">Cycle Time & SLA</h3>
              <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-0.5">
                Coming soon
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800 cursor-pointer h-full opacity-60"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-green-500/20">
              <Users size={24} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-green-700 dark:text-green-300">Workload Team</h3>
              <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-0.5">
                Coming soon
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <ReportFilters
        filterType={filterType}
        setFilterType={setFilterType}
        year={year}
        setYear={setYear}
        quarter={quarter}
        setQuarter={setQuarter}
        month={month}
        setMonth={setMonth}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        departmentId={departmentId}
        setDepartmentId={setDepartmentId}
        vendorId={vendorId}
        setVendorId={setVendorId}
      />

      {/* KPI Cards */}
      <KPICards data={reportData} isLoading={isLoading} />

      {/* Charts */}
      <ChartsGrid data={reportData} isLoading={isLoading} />
    </div>
  )
}
