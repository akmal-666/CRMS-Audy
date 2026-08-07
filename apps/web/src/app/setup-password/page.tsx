'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'

function SetupPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      toast.error('Invalid reset link')
      return
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
      const res = await fetch(`${apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to set password')
      }

      setSuccess(true)
      toast.success('Password set successfully!')
      
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (error: any) {
      toast.error(error.message)
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-danger">Invalid or missing reset token</p>
        <button onClick={() => router.push('/login')} className="btn-primary mt-4">
          Go to Login
        </button>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <CheckCircle2 size={32} className="text-success" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Password Set Successfully!</h2>
        <p className="text-muted-foreground">Redirecting to login page...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
          New Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input pr-10"
            placeholder="Enter your new password"
            required
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Must be at least 8 characters</p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="input"
          placeholder="Confirm your new password"
          required
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Setting Password...
          </>
        ) : (
          'Set Password'
        )}
      </button>
    </form>
  )
}

export default function SetupPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="card space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Set Your Password</h1>
            <p className="text-muted-foreground">
              Welcome to CRMS! Please create a secure password for your account.
            </p>
          </div>

          <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
            <SetupPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
