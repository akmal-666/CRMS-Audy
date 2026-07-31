import { Metadata } from 'next'
import { LoginForm } from '@/features/auth/login-form'
import { Clock, Grid3x3, Shield } from 'lucide-react'

export const metadata: Metadata = { title: 'Sign In | CRMS' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* ===== LEFT PANEL ===== */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between relative overflow-hidden" style={{ backgroundColor: '#f8f9ff' }}>

        {/* Background: dental unit photo fading right-to-center */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url(/dental-bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center right',
          }}
        />
        {/* Gradient overlay: white solid on left, fade out to transparent right */}
        <div
          className="absolute inset-0 z-10"
          style={{
            background: 'linear-gradient(to right, rgba(248,249,255,1) 0%, rgba(248,249,255,0.92) 35%, rgba(248,249,255,0.55) 65%, rgba(248,249,255,0.1) 100%)',
          }}
        />

        {/* Content over gradient */}
        <div className="relative z-20 flex flex-col justify-between h-full p-12 xl:p-16">

          {/* Top: Audy Dental Logo — original script style */}
          <div>
            <div
              style={{
                fontFamily: "'Brush Script MT', 'Segoe Script', cursive",
                fontSize: '2.6rem',
                color: '#2B3E88',
                lineHeight: 1,
                marginBottom: '0.1rem',
              }}
            >
              Audy
            </div>
            <div
              style={{
                fontFamily: "'Arial Narrow', Arial, sans-serif",
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.42em',
                color: '#2B3E88',
              }}
            >
              DENTAL
            </div>
          </div>

          {/* Middle: headline + features */}
          <div className="max-w-xs xl:max-w-sm">
            <h1
              className="font-bold leading-tight"
              style={{ fontSize: '2.4rem', color: '#1a1a2e' }}
            >
              IT Workflow
            </h1>
            <h2
              className="font-bold leading-tight mb-5"
              style={{ fontSize: '2.4rem', color: '#2D3E9F' }}
            >
              Request.
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed mb-10">
              Centralize all IT change requests with<br />
              full lifecycle management, Kanban tracking,<br />
              and real-time collaboration.
            </p>

            {/* Feature list */}
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full border border-slate-300 bg-white/60 flex items-center justify-center flex-shrink-0">
                  <Clock size={20} className="text-slate-700" />
                </div>
                <div>
                  <div className="text-slate-900 font-semibold text-sm">Real-Time Tracking</div>
                  <div className="text-slate-500 text-xs mt-0.5">Monitor progress in real-time</div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full border border-slate-300 bg-white/60 flex items-center justify-center flex-shrink-0">
                  <Grid3x3 size={20} className="text-slate-700" />
                </div>
                <div>
                  <div className="text-slate-900 font-semibold text-sm">Centralized Management</div>
                  <div className="text-slate-500 text-xs mt-0.5">All requests in one place</div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full border border-slate-300 bg-white/60 flex items-center justify-center flex-shrink-0">
                  <Shield size={20} className="text-slate-700" />
                </div>
                <div>
                  <div className="text-slate-900 font-semibold text-sm">Auditable Process</div>
                  <div className="text-slate-500 text-xs mt-0.5">Transparent and trackable workflow</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: copyright */}
          <p className="text-slate-400 text-[0.68rem]">
            © 2026 CRMS. Enterprise Change Request Management.
          </p>
        </div>
      </div>

      {/* ===== RIGHT PANEL — deep navy blue ===== */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #2B3E88 0%, #1a2760 100%)' }}
      >
        {/* Subtle decorative blobs */}
        <div className="absolute top-10 right-10 w-72 h-72 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6b7ff0, transparent)' }} />
        <div className="absolute bottom-16 left-8 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #4a90d9, transparent)' }} />

        {/* White login card */}
        <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-2xl px-10 py-9 relative z-10">
          <div className="mb-7 text-center">
            <h2 className="text-[1.6rem] font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500 text-sm mt-1.5">Sign in to your account</p>
          </div>

          <LoginForm />
        </div>

        {/* Security note below card */}
        <div className="w-full max-w-[400px] mt-5 flex items-start gap-3 relative z-10">
          <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <div className="text-white text-sm font-semibold">Your data is secure with us.</div>
            <div className="text-white/60 text-xs mt-0.5">We use enterprise-grade security to protect your information.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
