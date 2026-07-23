import { Metadata } from 'next'
import { LoginForm } from '@/features/auth/login-form'

export const metadata: Metadata = { title: 'Sign In | CRMS' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0F0F23] flex-col justify-between p-10">
        <div className="flex items-center gap-2.5">
          {/* Logo removed */}
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            IT Workflow <br />
            <span className="text-primary">Request.</span>
          </h1>
          <p className="text-white/50 text-base leading-relaxed">
            Centralize all IT change requests with full lifecycle management, Kanban tracking, and real-time collaboration.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-10">
            {[
              { label: 'Tracking', value: 'Real-Time' },
              { label: 'Management', value: 'Centralized' },
              { label: 'Process', value: 'Auditable' },
            ].map(stat => (
              <div key={stat.label} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-white/40 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/20 text-xs">© 2026 CRMS. Enterprise Change Request Management.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground">Welcome back</h2>
            <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
