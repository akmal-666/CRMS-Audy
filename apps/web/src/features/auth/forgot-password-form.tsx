'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { apiPost } from '@/lib/api'
import { toast } from 'sonner'
import Link from 'next/link'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type FormData = z.infer<typeof schema>

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await apiPost('/api/auth/forgot-password', { email: data.email })
      setSubmittedEmail(data.email)
      setSubmitted(true)
    } catch {
      // Show generic message to avoid leaking whether the email exists
      setSubmittedEmail(data.email)
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={28} className="text-success" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Check your email</h3>
          <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
            If <strong>{submittedEmail}</strong> is registered, you'll receive a password reset link within a few minutes.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Didn't receive it? Check your spam folder or{' '}
          <button
            onClick={() => setSubmitted(false)}
            className="text-primary hover:underline font-medium"
          >
            try again
          </button>
          .
        </p>
        <Link href="/login" className="btn-ghost w-full flex items-center justify-center gap-2 mt-2">
          <ArrowLeft size={15} />
          Back to Sign In
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Email address</label>
        <div className="relative">
          <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            {...register('email')}
            type="email"
            autoComplete="email"
            className="input pl-9"
            placeholder="you@company.com"
            autoFocus
          />
        </div>
        {errors.email && <p className="text-xs text-danger mt-1">{errors.email.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-2"
      >
        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
        {isSubmitting ? 'Sending...' : 'Send Reset Link'}
      </button>

      <Link href="/login" className="btn-ghost w-full flex items-center justify-center gap-2 py-2.5 text-sm">
        <ArrowLeft size={15} />
        Back to Sign In
      </Link>
    </form>
  )
}
