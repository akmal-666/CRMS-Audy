'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/api'
import { toast } from 'sonner'

const schema = z.object({
  requesterName: z.string().min(2, 'Name required'),
  requesterEmail: z.string().email('Invalid email'),
  departmentId: z.string().min(1, 'Select a department'),
  branchId: z.string().optional(),
  title: z.string().min(5, 'Title too short'),
  businessProcess: z.string().optional(),
  problemDescription: z.string().min(10, 'Description too short'),
  expectedSolution: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  dueDate: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function NewRequestForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [done, setDone] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium' },
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => apiGet<any[]>('/api/master/departments'),
    select: r => r.data ?? [],
  })

  const { data: branches } = useQuery({
    queryKey: ['branches', watch('departmentId')],
    queryFn: () => apiGet<any[]>('/api/master/branches', { departmentId: watch('departmentId') }),
    enabled: !!watch('departmentId'),
    select: r => r.data ?? [],
  })

  const submit = useMutation({
    mutationFn: (data: FormData) => apiPost<{ ticketNumber: string }>('/api/work-items/public/submit', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['work-items'] })
      setDone(res.data?.ticketNumber ?? 'N/A')
      toast.success('Request submitted!')
    },
    onError: () => toast.error('Failed to submit'),
  })

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card text-center py-12">
        <CheckCircle2 size={48} className="mx-auto text-success mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Submitted!</h2>
        <p className="text-muted-foreground mb-4">Ticket number:</p>
        <div className="inline-block px-6 py-3 bg-primary/10 rounded-xl mb-6">
          <span className="text-2xl font-mono font-bold text-primary">{done}</span>
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => router.push('/kanban')} className="btn-primary">View Kanban</button>
          <button onClick={() => { setDone(null) }} className="btn-secondary">New Request</button>
        </div>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit(d => submit.mutate(d))} className="card space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Your Name *</label>
          <input {...register('requesterName')} className="input" placeholder="John Doe" />
          {errors.requesterName && <p className="text-xs text-danger mt-1">{errors.requesterName.message}</p>}
        </div>
        <div>
          <label className="label">Your Email *</label>
          <input {...register('requesterEmail')} type="email" className="input" placeholder="john@company.com" />
          {errors.requesterEmail && <p className="text-xs text-danger mt-1">{errors.requesterEmail.message}</p>}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Department *</label>
          <select {...register('departmentId')} className="input">
            <option value="">Select department</option>
            {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {errors.departmentId && <p className="text-xs text-danger mt-1">{errors.departmentId.message}</p>}
        </div>
        <div>
          <label className="label">Branch</label>
          <select {...register('branchId')} className="input" disabled={!watch('departmentId')}>
            <option value="">Select branch</option>
            {branches?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Request Title *</label>
        <input {...register('title')} className="input" placeholder="Brief title of your request" />
        {errors.title && <p className="text-xs text-danger mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <label className="label">Business Process</label>
        <input {...register('businessProcess')} className="input" placeholder="e.g., Invoice Processing, Procurement" />
      </div>

      <div>
        <label className="label">Problem Description *</label>
        <textarea {...register('problemDescription')} rows={4} className="input" placeholder="Describe the issue in detail..." />
        {errors.problemDescription && <p className="text-xs text-danger mt-1">{errors.problemDescription.message}</p>}
      </div>

      <div>
        <label className="label">Expected Solution</label>
        <textarea {...register('expectedSolution')} rows={3} className="input" placeholder="What outcome do you expect?" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Priority *</label>
          <select {...register('priority')} className="input">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label className="label">Due Date</label>
          <input {...register('dueDate')} type="date" className="input" />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={submit.isPending} className="btn-primary flex items-center gap-2">
          {submit.isPending && <Loader2 size={15} className="animate-spin" />}
          Submit Request
        </button>
        <button type="button" onClick={() => router.back()} className="btn-ghost">Cancel</button>
      </div>
    </form>
  )
}
