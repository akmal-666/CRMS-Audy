'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { apiGet } from '@/lib/api'
import { exportToExcel, exportToCSV, exportToPDF } from '@/lib/export-utils'
import { Download, RefreshCw, Share2 } from 'lucide-react'
import { ReportFilters } from '../report-filters'
import { HealthKPICards } from './health-kpi-cards'
import { ProjectsHealthTable } from './projects-health-table'
import { HealthScoreDistribution } from './health-score-distribution'
import { IssuesSummary } from './issues-summary'
import { HealthScoreOverTime } from './health-score-over-time'
import { HealthByCategory } from './health-by-category'
import { TopRisks } from './top-risks'
import { Recommendations } from './recommendations'

export function ProjectHealthPage() {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const [filterType, setFilterType] = useState<'year' | 'quarter' | 'month' | 'custom'>('month')
  const [year, setYear] = useState(currentYear.toString())
  const [quarter, setQuarter] = useState('1')
  const [month, setMonth] = useState(currentMonth.toString())
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)

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

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['project-health', queryParams],
    queryFn: () => apiGet<any>('/api/reports/project-health', queryParams),
    select: (res) => res.data,
  })

  const handleExportExcel = () => {
    if (!reportData) return
    exportToExcel(reportData, `project-health-${new Date().toISOString().split('T')[0]}`)
    setShowExportMenu(false)
  }

  const handleExportCSV = () => {
    if (!reportData?.projects) return
    exportToCSV(reportData.projects, `project-health-${new Date().toISOString().split('T')[0]}`)
    setShowExportMenu(false)
  }

  const handleExportPDF = () => {
    if (!reportData) return
    exportToPDF(reportData, 'Project Health Report', queryParams)
    setShowExportMenu(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Project Health
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time health overview of all projects and initiatives
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => refetch()} 
            className="btn-secondary flex items-center gap-2 text-sm"
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          
          <button 
            onClick={() => window.print()} 
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Share2 size={14} />
            Share
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Download size={14} />
              Export
            </button>
            
            {showExportMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
              >
                <button
                  onClick={handleExportExcel}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Export as Excel
                </button>
                <button
                  onClick={handleExportCSV}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Export as CSV
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Export as PDF
                </button>
              </motion.div>
            )}
          </div>
        </div>
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
      <HealthKPICards data={reportData} isLoading={isLoading} />

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Projects Health Table - 2 columns */}
        <div className="lg:col-span-2">
          <ProjectsHealthTable data={reportData?.projects} isLoading={isLoading} />
        </div>

        {/* Health Score Distribution - 1 column */}
        <div className="lg:col-span-1">
          <HealthScoreDistribution data={reportData?.projectsByHealth} isLoading={isLoading} total={reportData?.summary?.totalProjects} />
        </div>
      </div>

      {/* Issues Summary */}
      <IssuesSummary data={reportData?.issuesSummary} isLoading={isLoading} />

      {/* Health Score Over Time & By Category */}
      <div className="grid lg:grid-cols-2 gap-6">
        <HealthScoreOverTime data={reportData?.healthTrend} isLoading={isLoading} />
        <HealthByCategory data={reportData?.healthByCategory} isLoading={isLoading} />
      </div>

      {/* Top Risks & Recommendations */}
      <div className="grid lg:grid-cols-2 gap-6">
        <TopRisks data={reportData?.topRisks} isLoading={isLoading} />
        <Recommendations data={reportData?.recommendations} isLoading={isLoading} />
      </div>
    </div>
  )
}
