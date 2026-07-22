'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table'
import { motion } from 'framer-motion'
import { Search, Filter, ChevronLeft, ChevronRight, Download, Trash2 } from 'lucide-react'
import { apiGet, apiDelete } from '@/lib/api'
import { WorkflowStatus, Priority } from '@crms/types'
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, formatDate, cn, exportToCSV } from '@/lib/utils'
import { TicketDetailDrawer } from '../tickets/ticket-detail-drawer'
import { useAuth } from '@/context/auth-context'
import { toast } from 'sonner'

interface WorkItem {
  id: string
  ticketNumber: string
  title: string
  status: string
  priority: string
  requesterName: string
  department?: { name: string }
  manager?: { name: string }
  dueDate?: string
  createdAt: string
}

const columnHelper = createColumnHelper<WorkItem>()

export function RequestsView() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const isAdmin = user?.role === 'administrator'

  const { data, isLoading } = useQuery({
    queryKey: ['work-items', 'list', page, search, statusFilter, priorityFilter],
    queryFn: () => apiGet<WorkItem[]>('/api/work-items', {
      page, pageSize: 20,
      ...(search && { search }),
      ...(statusFilter && { status: statusFilter }),
      ...(priorityFilter && { priority: priorityFilter }),
    }),
  })

  const items = (data?.data as WorkItem[]) ?? []
  const pagination = data?.pagination

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/work-items/${id}`),
    onSuccess: () => {
      toast.success('Request deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['work-items'] })
      setDeleteConfirm(null)
    },
    onError: () => {
      toast.error('Failed to delete request')
    },
  })

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteConfirm(id)
  }

  const confirmDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  const columns: ColumnDef<WorkItem, any>[] = [
    columnHelper.accessor('ticketNumber', {
      header: 'Ticket',
      cell: info => (
        <span className="text-xs font-mono text-muted-foreground">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('title', {
      header: 'Title',
      cell: info => (
        <span className="text-sm font-medium text-foreground line-clamp-1 max-w-xs">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => (
        <span className={cn('badge text-xs', STATUS_COLORS[info.getValue() as WorkflowStatus])}>
          {STATUS_LABELS[info.getValue() as WorkflowStatus]}
        </span>
      ),
    }),
    columnHelper.accessor('priority', {
      header: 'Priority',
      cell: info => (
        <span className={cn('badge text-xs', PRIORITY_COLORS[info.getValue() as Priority])}>
          {PRIORITY_LABELS[info.getValue() as Priority]}
        </span>
      ),
    }),
    columnHelper.accessor('requesterName', {
      header: 'Requester',
      cell: info => <span className="text-sm text-muted-foreground">{info.getValue()}</span>,
    }),
    columnHelper.accessor(row => row.department?.name, {
      id: 'department',
      header: 'Department',
      cell: info => <span className="text-sm text-muted-foreground">{info.getValue() ?? '—'}</span>,
    }),
    columnHelper.accessor(row => row.manager?.name, {
      id: 'manager',
      header: 'Manager',
      cell: info => <span className="text-sm text-muted-foreground">{info.getValue() ?? '—'}</span>,
    }),
    columnHelper.accessor('dueDate', {
      header: 'Due Date',
      cell: info => <span className="text-sm text-muted-foreground">{info.getValue() ? formatDate(info.getValue()) : '—'}</span>,
    }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      cell: info => <span className="text-sm text-muted-foreground">{formatDate(info.getValue())}</span>,
    }),
  ]

  // Add delete action column for administrators
  if (isAdmin) {
    columns.push(
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: info => (
          <button
            onClick={(e) => handleDelete(info.row.original.id, e)}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive hover:text-destructive transition-colors"
            title="Delete request"
          >
            <Trash2 size={14} />
          </button>
        ),
      })
    )
  }

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">All Requests</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{pagination?.total ?? 0} total requests</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => exportToCSV(items.map(i => ({
                ID: i.ticketNumber, Title: i.title, Status: STATUS_LABELS[i.status as WorkflowStatus], Priority: i.priority,
                Requester: i.requesterName, Department: i.department?.name, Manager: i.manager?.name, Created: i.createdAt
              })), 'requests_export')}
              className="btn-ghost flex items-center gap-1.5 text-sm"
            >
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card py-3 px-4 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by ticket, title, requester..."
              className="input pl-8 py-1.5 text-xs w-full"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="input py-1.5 text-xs w-36"
          >
            <option value="">All Status</option>
            {Object.values(WorkflowStatus).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={e => { setPriorityFilter(e.target.value); setPage(1) }}
            className="input py-1.5 text-xs w-32"
          >
            <option value="">All Priority</option>
            {Object.values(Priority).map(p => (
              <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="border-b border-border">
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {[...Array(9)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3 bg-muted rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : table.getRowModel().rows.map((row, i) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => setSelectedId(row.original.id)}
                    className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {!isLoading && items.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">No requests found</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground text-xs">
              Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="px-3 py-1 text-xs">Page {page} of {pagination.totalPages}</span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      <TicketDetailDrawer itemId={selectedId} onClose={() => setSelectedId(null)} />

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-xl"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Trash2 size={20} className="text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-foreground">Delete Request</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Are you sure you want to delete this request? This action cannot be undone. All related data (comments, attachments, activity logs) will be permanently deleted.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleteMutation.isPending}
                className="btn-ghost px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="btn-danger px-4 py-2 text-sm flex items-center gap-2"
              >
                {deleteMutation.isPending ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}
