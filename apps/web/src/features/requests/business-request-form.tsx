'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { apiGet, apiPost, apiUpload } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { FileUpload } from '@/components/file-upload'
import { useAuth } from '@/context/auth-context'
import Link from 'next/link'

const requestSchema = z.object({
  requesterName: z.string().min(2, 'Name must be at least 2 characters'),
  requesterEmail: z.string().email('Invalid email address'),
  departmentId: z.string().min(1, 'Please select a department'),
  vendorId: z.string().min(1, 'Please select a platform/vendor'),
  managerEmail: z.string().email('Invalid manager email address'),
  title: z.string().min(5, 'Title must be at least 5 characters'),
  problemDescription: z.string().min(10, 'Description must be at least 10 characters'),
  expectedSolution: z.string().min(10, 'Expected solution must be at least 10 characters'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  dueDate: z.string().min(1, 'Please select a target go-live date'),
})

type FormData = z.infer<typeof requestSchema>

export function BusinessRequestForm() {
  const { user } = useAuth()
  const [ticketNumber, setTicketNumber] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      priority: 'medium',
      requesterName: user?.name ?? '',
      requesterEmail: user?.email ?? '',
    },
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => apiGet<any[]>('/api/master/departments'),
    select: (res) => res.data ?? [],
  })

  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => apiGet<any[]>('/api/master/vendors'),
    select: (res) => res.data ?? [],
  })

  const submit = useMutation({
    mutationFn: async (data: FormData) => {
      // Submit ticket via the public submit endpoint (same form, now authenticated)
      const res = await apiPost<{ ticketNumber: string; id: string }>('/api/work-items/public/submit', data)

      // Upload attachments if any
      if (files.length > 0 && res.data?.id) {
        const formData = new globalThis.FormData()
        files.forEach(f => formData.append('files', f))
        formData.append('guestName', data.requesterName)
        await apiUpload(`/api/work-items/${res.data.id}/attachments`, formData)
      }

      return res
    },
    onSuccess: (res) => {
      setTicketNumber(res.data?.ticketNumber ?? 'N/A')
      toast.success('Request submitted successfully')
    },
    onError: () => toast.error('Failed to submit request. Please try again.'),
  })

  if (ticketNumber) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card text-center py-12"
      >
        <CheckCircle2 size={48} className="mx-auto text-success mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Request Submitted!</h2>
        <p className="text-muted-foreground mb-4">Your ticket number is:</p>
        <div className="inline-block px-6 py-3 bg-primary/10 rounded-xl">
          <span className="text-2xl font-mono font-bold text-primary">{ticketNumber}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-6 max-w-sm mx-auto">
          The IT team will review your request and contact you if clarification is needed.
        </p>
        <div className="flex gap-3 justify-center mt-6">
          <Link href="/requests" className="btn-secondary">
            View All Requests
          </Link>
          <button onClick={() => setTicketNumber(null)} className="btn-primary">
            Submit Another
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit(data => submit.mutate(data))} className="card space-y-5">
      {/* Requester Info — pre-filled from auth, but editable */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Your Name*</label>
          <input
            {...register('requesterName')}
            className="input"
            placeholder="John Doe"
          />
          {errors.requesterName && <p className="text-xs text-danger mt-1">{errors.requesterName.message}</p>}
        </div>
        <div>
          <label className="label">Your Email*</label>
          <input
            {...register('requesterEmail')}
            type="email"
            className="input"
            placeholder="john@company.com"
          />
          {errors.requesterEmail && <p className="text-xs text-danger mt-1">{errors.requesterEmail.message}</p>}
        </div>
      </div>

      {/* Department & Platform/Vendor */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Department*</label>
          <select
            {...register('departmentId')}
            className={cn('input', errors.departmentId && 'border-destructive/50 focus:ring-destructive')}
          >
            <option value="">Select department</option>
            {departments?.map((dept: any) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
          {errors.departmentId && <p className="text-xs text-danger mt-1">{errors.departmentId.message}</p>}
        </div>
        <div>
          <label className="label">Platform*</label>
          <select
            {...register('vendorId')}
            className={cn('input', errors.vendorId && 'border-destructive/50 focus:ring-destructive')}
          >
            <option value="">Select platform</option>
            {vendors?.map((v: any) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          {errors.vendorId && <p className="text-xs text-danger mt-1">{errors.vendorId.message}</p>}
        </div>
      </div>

      {/* Manager Email */}
      <div>
        <label className="label">Assign Manager Email*</label>
        <input
          {...register('managerEmail')}
          type="email"
          className={cn('input', errors.managerEmail && 'border-destructive/50 focus:ring-destructive')}
          placeholder="manager@company.com"
        />
        {errors.managerEmail && <p className="text-xs text-danger mt-1">{errors.managerEmail.message}</p>}
      </div>

      {/* Title */}
      <div>
        <label className="label">Request Title*</label>
        <input
          {...register('title')}
          className="input"
          placeholder="Brief title of your change request"
        />
        {errors.title && <p className="text-xs text-danger mt-1">{errors.title.message}</p>}
      </div>

      {/* Problem Description */}
      <div>
        <label className="label">Problem Description*</label>
        <textarea
          {...register('problemDescription')}
          rows={4}
          className="input"
          placeholder="Describe the issue or requirement in detail..."
        />
        {errors.problemDescription && <p className="text-xs text-danger mt-1">{errors.problemDescription.message}</p>}
      </div>

      {/* Expected Solution */}
      <div>
        <label className="label">Expected Solution*</label>
        <textarea
          {...register('expectedSolution')}
          rows={3}
          className={cn('input', errors.expectedSolution && 'border-destructive/50 focus:ring-destructive')}
          placeholder="Describe what outcome or solution you expect..."
        />
        {errors.expectedSolution && <p className="text-xs text-danger mt-1">{errors.expectedSolution.message}</p>}
      </div>

      {/* Priority & Expected Go-Live */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Priority*</label>
          <select {...register('priority')} className="input">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label className="label">Expected Go-Live*</label>
          <input
            {...register('dueDate')}
            type="date"
            className={cn('input', errors.dueDate && 'border-destructive/50 focus:ring-destructive')}
          />
          {errors.dueDate && <p className="text-xs text-danger mt-1">{errors.dueDate.message}</p>}
        </div>
      </div>

      {/* Attachments */}
      <div>
        <label className="label">Attachments (Optional)</label>
        <FileUpload autoUpload={false} onChange={setFiles} />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submit.isPending}
          className="btn-primary flex items-center justify-center gap-2 flex-1"
        >
          {submit.isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Request'
          )}
        </button>
        <Link href="/kanban" className="btn-ghost px-6">
          Cancel
        </Link>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        By submitting this request, you agree that the IT team may contact you for clarification.
      </p>
    </form>
  )
}
