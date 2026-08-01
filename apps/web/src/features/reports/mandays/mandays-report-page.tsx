'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, RefreshCw, Plus } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { exportToExcel, exportToCSV } from '@/lib/export-utils'
import { ReportFilters } from '../report-filters'
import { MandaysKPICards } from './mandays-kpi-cards'
import { MandaysByVendorChart } from './mandays-by-vendor-chart'
import { MandaysTrendChart } from './mandays-trend-chart'
import { MandaysByProjectTable } from './mandays-by-project-table'
import { MandaysDeviationChart } from './mandays-deviation-chart'
import { TopupsHistoryTable } from './topups-history-table'
import { TopupModal } from './topup-modal'

export function MandaysReportPage() {
  const queryClient = useQueryClient()
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const [filterType, setFilterType] = useState<'year' | 'quarter' | 'month' | 'custom'>('year')
  const [year, setYear] = useState(currentYear.toString())
  const [quarter, setQuarter] = useState('1')
  const [month, setMonth] = useState(currentMonth.toString())
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showTopupModal, setShowTopupModal] = useState(false)

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
    queryKey: ['mandays-report', queryParams],
    queryFn: () => apiGet<any>('/api/reports/mandays', queryParams),
    select: (res) => res.data,
  })

  const handleExportExcel = () => {
    if (!reportData) return
    exportToExcel(reportData.projectMandays, `mandays-report-${new Date().toISOString().split('T')[0]}`)
    setShowExportMenu(false)
  }

  const handleExportCSV = () => {
    if (!reportData?.projectMandays) return
    exportToCSV(reportData.projectMandays, `mandays-report-${new Date().toISOString().split('T')[0]}`)
    setShowExportMenu(false)
  }

  const handleTopupSuccess = () => {
    setShowTopupModal(false)
    refetch()
    queryClient.invalidateQueries({ queryKey: ['mandays-report'] })
  }

  const getDateRangeLabel = () => {
    if (filterType === 'custom' && startDate && endDate) {
      return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
    } else if (filterType === 'quarter') {
      return `Q${quarter} ${year}`
    } else if (filterType === 'month') {
      const date = new Date(parseInt(year), parseInt(month) - 1)
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
    return year
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Mandays / Effort Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor and analyze mandays usage across teams, vendors, and projects.
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Period: {getDateRangeLabel()}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowTopupModal(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={14} />
            Add Top-up
          </button>

          <button 
            onClick={() => refetch()} 
            className="btn-secondary flex items-center gap-2 text-sm"
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Download size={14} />
              Export
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
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
              </div>
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
      <MandaysKPICards data={reportData} isLoading={isLoading} />

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <MandaysByVendorChart data={reportData?.vendorMandays} isLoading={isLoading} />
        <MandaysTrendChart data={reportData?.mandaysTrend} isLoading={isLoading} />
      </div>

      {/* Deviation Analysis */}
      <MandaysDeviationChart data={reportData?.deviationAnalysis} isLoading={isLoading} />

      {/* Projects Table */}
      <MandaysByProjectTable data={reportData?.projectMandays} isLoading={isLoading} />

      {/* Topups History */}
      <TopupsHistoryTable data={reportData?.topups} isLoading={isLoading} />

      {/* Topup Modal */}
      {showTopupModal && (
        <TopupModal 
          isOpen={showTopupModal}
          onClose={() => setShowTopupModal(false)}
          onSuccess={handleTopupSuccess}
        />
      )}
    </div>
  )
}
