import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Filter as FilterIcon } from 'lucide-react'
import { apiGet } from '@/lib/api'

interface ReportFiltersProps {
  filterType: 'year' | 'quarter' | 'month' | 'custom'
  setFilterType: (type: 'year' | 'quarter' | 'month' | 'custom') => void
  year: string
  setYear: (year: string) => void
  quarter: string
  setQuarter: (quarter: string) => void
  month: string
  setMonth: (month: string) => void
  startDate: string
  setStartDate: (date: string) => void
  endDate: string
  setEndDate: (date: string) => void
  departmentId: string
  setDepartmentId: (id: string) => void
}

export function ReportFilters(props: ReportFiltersProps) {
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => apiGet<any[]>('/api/master/departments'),
    select: (res) => res.data ?? [],
  })

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const quarters = [1, 2, 3, 4]
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2024, i).toLocaleDateString('en-US', { month: 'long' }),
  }))

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card">
      <div className="flex items-center gap-2 mb-4">
        <FilterIcon size={16} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Filters</h3>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Filter Type */}
        <div>
          <label className="label text-xs">Period</label>
          <select
            value={props.filterType}
            onChange={(e) => props.setFilterType(e.target.value as any)}
            className="input text-sm py-2"
          >
            <option value="year">Year</option>
            <option value="quarter">Quarter</option>
            <option value="month">Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {/* Year */}
        {props.filterType !== 'custom' && (
          <div>
            <label className="label text-xs">Year</label>
            <select value={props.year} onChange={(e) => props.setYear(e.target.value)} className="input text-sm py-2">
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Quarter */}
        {props.filterType === 'quarter' && (
          <div>
            <label className="label text-xs">Quarter</label>
            <select value={props.quarter} onChange={(e) => props.setQuarter(e.target.value)} className="input text-sm py-2">
              {quarters.map((q) => (
                <option key={q} value={q}>
                  Q{q}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Month */}
        {props.filterType === 'month' && (
          <div>
            <label className="label text-xs">Month</label>
            <select value={props.month} onChange={(e) => props.setMonth(e.target.value)} className="input text-sm py-2">
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Custom Date Range */}
        {props.filterType === 'custom' && (
          <>
            <div>
              <label className="label text-xs">Start Date</label>
              <input
                type="date"
                value={props.startDate}
                onChange={(e) => props.setStartDate(e.target.value)}
                className="input text-sm py-2"
              />
            </div>
            <div>
              <label className="label text-xs">End Date</label>
              <input
                type="date"
                value={props.endDate}
                onChange={(e) => props.setEndDate(e.target.value)}
                className="input text-sm py-2"
              />
            </div>
          </>
        )}

        {/* Department */}
        <div className={props.filterType === 'custom' ? '' : 'lg:col-span-2'}>
          <label className="label text-xs">Department</label>
          <select value={props.departmentId} onChange={(e) => props.setDepartmentId(e.target.value)} className="input text-sm py-2">
            <option value="">All Departments</option>
            {departments?.map((dept: any) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </motion.div>
  )
}
