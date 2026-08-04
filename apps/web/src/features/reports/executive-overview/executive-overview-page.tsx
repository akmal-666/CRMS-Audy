'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { apiGet } from '@/lib/api'
import { Download, Share2, RefreshCw } from 'lucide-react'
import { ReportFilters } from '../report-filters'
import { OverviewKPICards } from './overview-kpi-cards'
import { StatusChart } from './status-chart'
import { TrendChart } from './trend-chart'
import { ProjectProgressList } from './project-progress-list'
import { TimelineRoadmap } from './timeline-roadmap'
import { PriorityChart } from './priority-chart'
import { SLAChart } from './sla-chart'
import { WorkloadChart } from './workload-chart'
import { CycleTimeChart } from './cycle-time-chart'
import { RecentActivity } from './recent-activity'
import { ProjectHealthTable } from './project-health-table'
import { MandaysVendorKPI } from './mandays-vendor-kpi'

export function ExecutiveOverviewPage() {
  const [mounted, setMounted] = useState(false)
  const [filterType, setFilterType] = useState<'year' | 'quarter' | 'month' | 'custom'>('month')
  const [year, setYear] = useState('2026')
  const [quarter, setQuarter] = useState('1')
  const [month, setMonth] = useState('7')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)

  useEffect(() => {
    const now = new Date()
    setYear(now.getFullYear().toString())
    setMonth((now.getMonth() + 1).toString())
    setMounted(true)
  }, [])

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
    queryKey: ['executive-overview', queryParams],
    queryFn: () => apiGet<any>('/api/reports/executive-overview', queryParams),
    select: (res) => res.data,
    enabled: mounted,
  })

  // Debug: log data when it changes
  useEffect(() => {
    if (reportData) {
      console.log('📊 Executive Overview Data:', reportData)
      console.log('📈 Status Data:', reportData.requestsByStatus)
    }
  }, [reportData])

  const handleExportExcel = async () => {
    if (!reportData) return
    const { exportToExcel } = await import('@/lib/export-utils')
    exportToExcel(reportData, `executive-overview-${new Date().toISOString().split('T')[0]}`)
    setShowExportMenu(false)
  }

  const handleExportCSV = async () => {
    if (!reportData?._exportData?.items) return
    const { exportToCSV } = await import('@/lib/export-utils')
    exportToCSV(reportData._exportData.items, `executive-overview-${new Date().toISOString().split('T')[0]}`)
    setShowExportMenu(false)
  }

  const handleExportPDF = async () => {
    if (!reportData) return
    const { exportToPDF } = await import('@/lib/export-utils')
    exportToPDF(reportData, 'Executive Overview Report', queryParams)
    setShowExportMenu(false)
  }

  const getDateRangeLabel = () => {
    if (filterType === 'custom' && startDate && endDate) {
      return `${startDate} - ${endDate}`
    } else if (filterType === 'quarter') {
      return `Q${quarter} ${year}`
    } else if (filterType === 'month') {
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      return `${monthNames[parseInt(month) - 1]} ${year}`
    }
    return year
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Executive Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            High-level summary of project portfolio performance and delivery status.
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Period: {getDateRangeLabel()}
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
            Print
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

      <OverviewKPICards data={reportData} isLoading={isLoading} />

      <MandaysVendorKPI
        data={reportData?.mandaysPerVendor}
        summary={reportData?.mandaysSummary}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-1">
          <StatusChart data={reportData?.requestsByStatus} isLoading={isLoading} total={reportData?.summary?.totalRequests} />
        </div>

        <div className="lg:col-span-2">
          <TrendChart data={reportData?.monthlyTrend} isLoading={isLoading} filterType={filterType} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <ProjectProgressList data={reportData?.projectProgress} isLoading={isLoading} />
        <TimelineRoadmap data={reportData?.timelineProjects} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <PriorityChart data={reportData?.requestsByPriority} isLoading={isLoading} />
        <SLAChart data={reportData?.slaBreakdown} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <WorkloadChart data={reportData?.workloadByAssignee} isLoading={isLoading} />
        <CycleTimeChart data={reportData?.avgCycleTimeByStage} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-1">
          <RecentActivity data={reportData?.recentActivity} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-2">
          <ProjectHealthTable data={reportData?.projectsHealth} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}
