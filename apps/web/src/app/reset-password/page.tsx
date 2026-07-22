import { Metadata } from 'next'
import { Suspense } from 'react'
import { ResetPasswordForm } from '@/features/auth/reset-password-form'

export const metadata: Metadata = { title: 'Reset Password | CRMS' }

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0F0F23] flex-col justify-between p-10">
        <div className="flex items-center gap-2.5">
          <img src="/audy-logo.svg" alt="Audy Dental" className="h-20 w-auto bg-white rounded-xl px-3 py-2" />
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            IT Workflow <br />
            <span className="text-primary">Request.</span>
          </h1>
          <p className="text-white/50 text-base leading-relaxed">
            Centralize all IT change requests with full lifecycle management, Kanban tracking, and real-time collaboration.
          </p>
        </div>

        <p className="text-white/20 text-xs">© 2026 CRMS. Enterprise Change Request Management.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="lg:hidden flex items-center gap-2 mb-6">
              <img src="/audy-logo.svg" alt="Audy Dental" className="h-12 w-auto bg-white rounded-lg px-2 py-1" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">Set new password</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Choose a strong password for your account.
            </p>
          </div>
          {/* Suspense required because ResetPasswordForm uses useSearchParams */}
          <Suspense fallback={<div className="h-40 animate-pulse bg-muted rounded-xl" />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
