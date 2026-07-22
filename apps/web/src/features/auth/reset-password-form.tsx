'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react'
import { apiPost } from '@/lib/api'
import { toast } from 'sonner'
import Link from 'next/link'

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

export function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [done, setDone] = useState(false)
  const [tokenError, setTokenError] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 bg-danger/10 rounded-full flex items-center justify-center mx-auto">
          <XCircle size={28} className="text-danger" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Invalid link</h3>
          <p className="text-muted-foreground text-sm mt-2">
            This password reset link is missing a token. Please request a new one.
          </p>
        </div>
        <Link href="/forgot-password" className="btn-primary w-full flex items-center justify-center py-2.5">
          Request New Link
        </Link>
      </div>
    )
  }

  if (tokenError) {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 bg-danger/10 rounded-full flex items-center justify-center mx-auto">
          <XCircle size={28} className="text-danger" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Link expired</h3>
          <p className="text-muted-foreground text-sm mt-2">
            This reset link is invalid or has expired. Please request a new one.
          </p>
        </div>
        <Link href="/forgot-password" className="btn-primary w-full flex items-center justify-center py-2.5">
          Request New Link
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={28} className="text-success" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Password updated!</h3>
          <p className="text-muted-foreground text-sm mt-2">
            Your password has been reset successfully. You can now sign in with your new password.
          </p>
        </div>
        <Link href="/login" className="btn-primary w-full flex items-center justify-center py-2.5">
          Sign In
        </Link>
      </div>
    )
  }

  const onSubmit = async (data: FormData) => {
    try {
      await apiPost('/api/auth/reset-password', { token, password: data.password })
      setDone(true)
      toast.success('Password updated successfully')
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? ''
      if (msg.includes('invalid') || msg.includes('expired')) {
        setTokenError(true)
      } else {
        toast.error(msg || 'Failed to reset password. Please try again.')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">New Password</label>
        <div className="relative">
          <input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className="input pr-10"
            placeholder="At least 8 characters"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-danger mt-1">{errors.password.message}</p>}
      </div>

      <div>
        <label className="label">Confirm New Password</label>
        <div className="relative">
          <input
            {...register('confirmPassword')}
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            className="input pr-10"
            placeholder="Repeat your new password"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {errors.confirmPassword && <p className="text-xs text-danger mt-1">{errors.confirmPassword.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-2"
      >
        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
        {isSubmitting ? 'Updating...' : 'Set New Password'}
      </button>
    </form>
  )
}
