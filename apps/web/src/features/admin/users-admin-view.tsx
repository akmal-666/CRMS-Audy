'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Search, Edit2, UserX, ShieldCheck, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiGet, apiPost, apiPatch } from '@/lib/api'
import { UserRole } from '@crms/types'
import { getInitials, cn } from '@/lib/utils'
import { toast } from 'sonner'

const ROLE_LABELS: Record<string, string> = {
  administrator: 'Administrator',
  manager: 'Manager',
  business_user: 'Business User',
  business_analyst: 'Business Analyst',
  developer: 'Developer',
  qa: 'QA',
  uat_user: 'UAT User',
  vendor: 'Vendor',
  requester: 'Requester',
}

const ROLE_COLORS: Record<string, string> = {
  administrator: 'bg-red-100 text-red-700',
  manager: 'bg-purple-100 text-purple-700',
  business_user: 'bg-emerald-100 text-emerald-700',
  business_analyst: 'bg-blue-100 text-blue-700',
  developer: 'bg-violet-100 text-violet-700',
  qa: 'bg-amber-100 text-amber-700',
  uat_user: 'bg-orange-100 text-orange-700',
  vendor: 'bg-cyan-100 text-cyan-700',
  requester: 'bg-slate-100 text-slate-600',
}

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, 'Min 8 characters'),
  role: z.nativeEnum(UserRole),
  departmentId: z.string().optional(),
})

type CreateUserForm = z.infer<typeof createUserSchema>

export function UsersAdminView() {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => apiGet<any[]>('/api/users', { search: search || undefined }),
    select: r => (r.data as any)?.data ?? r.data ?? [],
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => apiGet<any[]>('/api/master/departments'),
    select: r => r.data ?? [],
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: UserRole.REQUESTER },
  })

  const createUser = useMutation({
    mutationFn: (data: CreateUserForm) => apiPost('/api/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User created')
      reset()
      setShowCreate(false)
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => apiPatch(`/api/users/${id}`, { isActive: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User deactivated')
    },
  })

  const users: any[] = Array.isArray(data) ? data : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{users.length} users</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={14} /> Add User
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Create New User</h3>
          <form onSubmit={handleSubmit(d => createUser.mutate(d))} className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="label">Full Name</label>
              <input {...register('name')} className="input" placeholder="John Doe" />
              {errors.name && <p className="text-xs text-danger mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" className="input" placeholder="john@company.com" />
              {errors.email && <p className="text-xs text-danger mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <input {...register('password')} type="password" className="input" placeholder="Min 8 characters" />
              {errors.password && <p className="text-xs text-danger mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="label">Role</label>
              <select {...register('role')} className="input">
                {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Department</label>
              <select {...register('departmentId')} className="input">
                <option value="">Select department</option>
                {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" disabled={createUser.isPending} className="btn-primary flex items-center gap-1.5">
                {createUser.isPending && <Loader2 size={14} className="animate-spin" />} Create
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Search */}
      <div className="card py-3 px-4">
        <div className="relative max-w-sm">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="input pl-8 py-1.5 text-xs" />
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['User', 'Role', 'Department', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? [...Array(5)].map((_, i) => (
              <tr key={i} className="border-b border-border/50">
                {[...Array(5)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-3 bg-muted rounded animate-pulse" /></td>)}
              </tr>
            )) : users.map((user: any, i: number) => (
              <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                      {getInitials(user.name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('badge', ROLE_COLORS[user.role] ?? 'bg-muted text-muted-foreground')}>
                    {ROLE_LABELS[user.role] ?? user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{user.department?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={cn('badge', user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {user.isActive && (
                    <button onClick={() => deactivate.mutate(user.id)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-danger" title="Deactivate">
                      <UserX size={14} />
                    </button>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {!isLoading && users.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">No users found</p>}
      </div>
    </div>
  )
}
