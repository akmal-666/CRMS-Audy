'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Search, Edit2, Check, X, Loader2, Building2, GitBranch, Users2, Trash2, Download } from 'lucide-react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import { cn, exportToCSV } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'

type MasterDataType = 'departments' | 'branches' | 'vendors'

interface MasterDataViewProps {
  type: MasterDataType
  title: string
}

const TYPE_CONFIG: Record<MasterDataType, {
  endpoint: string
  icon: React.ElementType
  fields: { key: string; label: string; placeholder: string; required?: boolean }[]
  color: string
}> = {
  departments: {
    endpoint: '/api/master/departments',
    icon: Building2,
    fields: [
      { key: 'name', label: 'Department Name', placeholder: 'e.g. Information Technology', required: true },
      { key: 'code', label: 'Code', placeholder: 'e.g. IT', required: true },
    ],
    color: 'text-blue-600 bg-blue-50',
  },
  branches: {
    endpoint: '/api/master/branches',
    icon: GitBranch,
    fields: [
      { key: 'name', label: 'Branch Name', placeholder: 'e.g. Jakarta Branch', required: true },
      { key: 'code', label: 'Code', placeholder: 'e.g. JKT', required: true },
    ],
    color: 'text-violet-600 bg-violet-50',
  },
  vendors: {
    endpoint: '/api/master/vendors',
    icon: Users2,
    fields: [
      { key: 'name', label: 'Vendor Name', placeholder: 'e.g. PT. Tech Solutions', required: true },
      { key: 'code', label: 'Code', placeholder: 'e.g. TS', required: true },
      { key: 'contactPerson', label: 'Contact Person', placeholder: 'e.g. John Doe' },
      { key: 'email', label: 'Email', placeholder: 'e.g. vendor@example.com' },
      { key: 'phone', label: 'Phone', placeholder: 'e.g. +62812345678' },
    ],
    color: 'text-cyan-600 bg-cyan-50',
  },
}

export function MasterDataView({ type, title }: MasterDataViewProps) {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [editData, setEditData] = useState<Record<string, string>>({})
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'administrator'

  const config = TYPE_CONFIG[type]
  const Icon = config.icon

  const { data, isLoading } = useQuery({
    queryKey: [type],
    queryFn: () => apiGet<any[]>(config.endpoint),
    select: (r) => (r as any)?.data ?? [],
  })

  const items: any[] = Array.isArray(data) ? data : []
  const filtered = items.filter((item) =>
    search === '' ||
    item.name?.toLowerCase().includes(search.toLowerCase()) ||
    item.code?.toLowerCase().includes(search.toLowerCase())
  )

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, string>) => apiPost(config.endpoint, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [type] })
      toast.success(`${title.slice(0, -1)} created successfully`)
      setFormData({})
      setShowCreate(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, string> }) =>
      apiPut(`${config.endpoint}/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [type] })
      toast.success(`${title.slice(0, -1)} updated successfully`)
      setEditingId(null)
      setEditData({})
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`${config.endpoint}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [type] })
      toast.success(`${title.slice(0, -1)} deleted successfully`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to delete'),
  })

  function handleCreate() {
    const missing = config.fields.find((f) => f.required && !formData[f.key]?.trim())
    if (missing) {
      toast.error(`${missing.label} is required`)
      return
    }
    createMutation.mutate(formData)
  }

  function startEdit(item: any) {
    setEditingId(item.id)
    const d: Record<string, string> = {}
    config.fields.forEach((f) => { d[f.key] = item[f.key] ?? '' })
    setEditData(d)
  }

  function handleUpdate(id: string) {
    updateMutation.mutate({ id, payload: editData })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} {title.toLowerCase()} found
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportToCSV(filtered, `${title.toLowerCase()}_export`)}
            className="btn-ghost flex items-center gap-1.5 text-sm"
          >
            <Download size={14} /> Export
          </button>
          <button
            onClick={() => { setShowCreate(!showCreate); setFormData({}) }}
            className="btn-primary flex items-center gap-1.5 text-sm"
          >
            <Plus size={14} /> Add {title.slice(0, -1)}
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Add New {title.slice(0, -1)}
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {config.fields.map((field) => (
              <div key={field.key}>
                <label className="label">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <input
                  className="input"
                  placeholder={field.placeholder}
                  value={formData[field.key] ?? ''}
                  onChange={(e) => setFormData((p) => ({ ...p, [field.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="btn-primary flex items-center gap-1.5"
            >
              {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Create
            </button>
            <button
              onClick={() => { setShowCreate(false); setFormData({}) }}
              className="btn-ghost"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Search */}
      <div className="card py-3 px-4">
        <div className="relative max-w-sm">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${title.toLowerCase()}...`}
            className="input pl-8 py-1.5 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {title.slice(0, -1)}
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Code
              </th>
              {type === 'vendors' && (
                <>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Email
                  </th>
                </>
              )}
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 w-16" />
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {[...Array(type === 'vendors' ? 5 : 4)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-muted rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.map((item: any, i: number) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    {/* Name cell — editable */}
                    <td className="px-4 py-3">
                      {editingId === item.id ? (
                        <input
                          className="input py-1 text-sm"
                          value={editData['name'] ?? ''}
                          onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0', config.color)}>
                            <Icon size={13} />
                          </div>
                          <span className="text-sm font-medium text-foreground">{item.name}</span>
                        </div>
                      )}
                    </td>

                    {/* Code cell — editable */}
                    <td className="px-4 py-3">
                      {editingId === item.id ? (
                        <input
                          className="input py-1 text-sm w-24"
                          value={editData['code'] ?? ''}
                          onChange={(e) => setEditData((p) => ({ ...p, code: e.target.value }))}
                        />
                      ) : (
                        <span className="badge bg-muted text-muted-foreground font-mono text-xs">
                          {item.code}
                        </span>
                      )}
                    </td>

                    {/* Vendor-only: contact + email */}
                    {type === 'vendors' && (
                      <>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {editingId === item.id ? (
                            <input
                              className="input py-1 text-sm"
                              value={editData['contactPerson'] ?? ''}
                              onChange={(e) => setEditData((p) => ({ ...p, contactPerson: e.target.value }))}
                              placeholder="Contact person"
                            />
                          ) : (
                            item.contactPerson ?? '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {editingId === item.id ? (
                            <input
                              className="input py-1 text-sm"
                              value={editData['email'] ?? ''}
                              onChange={(e) => setEditData((p) => ({ ...p, email: e.target.value }))}
                              placeholder="Email"
                            />
                          ) : (
                            item.email ?? '-'
                          )}
                        </td>
                      </>
                    )}

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'badge',
                          item.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-600'
                        )}
                      >
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {editingId === item.id ? (
                          <>
                            <button
                              onClick={() => handleUpdate(item.id)}
                              disabled={updateMutation.isPending}
                              className="p-1.5 rounded hover:bg-green-50 text-green-600 transition-colors"
                              title="Save"
                            >
                              {updateMutation.isPending ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Check size={14} />
                              )}
                            </button>
                            <button
                              onClick={() => { setEditingId(null); setEditData({}) }}
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEdit(item)}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {isAdmin && !editingId && (
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this data? This action cannot be undone.')) {
                                deleteMutation.mutate(item.id)
                              }
                            }}
                            className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
          </tbody>
        </table>

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12">
            <Icon size={32} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? `No ${title.toLowerCase()} match "${search}"` : `No ${title.toLowerCase()} yet`}
            </p>
            {!search && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-3 text-xs text-primary hover:underline"
              >
                Add the first one
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
