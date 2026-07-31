import { Metadata } from 'next'
import { LoginForm } from '@/features/auth/login-form'
import { Clock, Grid3x3, Shield } from 'lucide-react'

export const metadata: Metadata = { title: 'Sign In | CRMS' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel - Light Background */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-50 flex-col justify-between p-12 xl:p-16">
        {/* Logo/Brand */}
        <div>
          <div className="text-3xl font-semibold text-slate-800 mb-1" style={{ fontFamily: 'serif' }}>
            Audy
          </div>
          <div className="text-xs tracking-wider text-slate-500 uppercase" style={{ fontFamily: 'serif' }}>
            DENTAL
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-md">
          <h1 className="text-4xl xl:text-5xl font-bold text-slate-900 leading-tight mb-4">
            IT Workflow
          </h1>
          <h2 className="text-4xl xl:text-5xl font-bold text-[#2D3E9F] leading-tight mb-6">
            Request.
          </h2>
          <p className="text-slate-600 text-base leading-relaxed">
            Centralize all IT change requests with<br />
            full lifecycle management, Kanban tracking,<br />
            and real-time collaboration.
          </p>

          {/* Features */}
          <div className="space-y-6 mt-12">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                <Clock size={20} className="text-slate-700" />
              </div>
              <div>
                <div className="text-slate-900 font-semibold text-sm">Real-Time Tracking</div>
                <div className="text-slate-500 text-sm">Monitor progress in real-time</div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                <Grid3x3 size={20} className="text-slate-700" />
              </div>
              <div>
                <div className="text-slate-900 font-semibold text-sm">Centralized Management</div>
                <div className="text-slate-500 text-sm">All requests in one place</div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                <Shield size={20} className="text-slate-700" />
              </div>
              <div>
                <div className="text-slate-900 font-semibold text-sm">Auditable Process</div>
                <div className="text-slate-500 text-sm">Transparent and trackable workflow</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-slate-400 text-xs">© 2026 CRMS. Enterprise Change Request Management.</p>
      </div>

      {/* Right panel - Blue Background with Card */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-[#2B3E88] to-[#1E2B5F] relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl" />
        
        {/* Login Card */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 relative z-10">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500 text-sm mt-2">Sign in to your account</p>
          </div>
          
          <LoginForm />

          {/* Security Note */}
          <div className="mt-8 flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <Shield size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-blue-900">Your data is secure with us.</div>
              <div className="text-xs text-blue-700 mt-0.5">We use enterprise-grade security to protect your information.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
