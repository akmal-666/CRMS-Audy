'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { apiGet } from '@/lib/api'
import { exportToCSV } from '@/lib/utils'
import { Download, BarChart3, FilterIcon } from 'lucide-react'
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

  const queryParams = useMemo(() => {
    const params: any = {}
    if (departmentId) params.departmentId = departmentId
    
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
  }, [filterType, year, quarter, month, startDate, endDate, departmentId])

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
      />

      {/* KPI Cards */}
      <KPICards data={reportData} isLoading={isLoading} />

      {/* Charts */}
      <ChartsGrid data={reportData} isLoading={isLoading} />
    </div>
  )
}
