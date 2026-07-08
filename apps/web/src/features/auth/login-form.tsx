'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { toast } from 'sonner'

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password)
      router.replace('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid email or password')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Email address</label>
        <input
          {...register('email')}
          type="email"
          autoComplete="email"
          className="input"
          placeholder="you@company.com"
        />
        {errors.email && <p className="text-xs text-danger mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="label mb-0">Password</label>
          <a href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</a>
        </div>
        <div className="relative">
          <input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            className="input pr-10"
            placeholder="••••••••"
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

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-2">
        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
        {isSubmitting ? 'Signing in...' : 'Sign in'}
      </button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-2 text-muted-foreground">No account needed to submit a request</span>
        </div>
      </div>

      <a href="/submit" className="btn-secondary w-full text-center block py-2.5 text-sm">
        Submit a Request (Public)
      </a>
    </form>
  )
}
