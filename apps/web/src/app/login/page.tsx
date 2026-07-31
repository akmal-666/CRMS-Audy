import { Metadata } from 'next'
import { LoginForm } from '@/features/auth/login-form'
import { Clock, Grid3x3, Shield } from 'lucide-react'

export const metadata: Metadata = { title: 'Sign In | CRMS' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">

      {/* ===== LEFT PANEL ===== */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between relative overflow-hidden bg-white">

        {/* Background: foto klinik Audy Dental actual */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url(/clinic-bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center right',
          }}
        />

        {/* Gradient overlay: solid white kiri, fade ke transparan kanan */}
        <div
          className="absolute inset-0 z-10"
          style={{
            background: 'linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0.97) 30%, rgba(255,255,255,0.75) 55%, rgba(255,255,255,0.15) 100%)',
          }}
        />

        {/* All content sits above overlay */}
        <div className="relative z-20 flex flex-col justify-between h-full p-12 xl:p-14">

          {/* TOP: Logo Audy Dental - gambar original */}
          <div>
            <img
              src="/audy-logo.png"
              alt="Audy Dental"
              className="h-20 w-auto object-contain"
              style={{ maxWidth: '180px' }}
            />
          </div>

          {/* MIDDLE: Headline + tagline + features */}
          <div className="max-w-xs xl:max-w-sm">
            <h1
              className="font-bold leading-tight"
              style={{ fontSize: '2.5rem', color: '#1a1a2e' }}
            >
              IT Workflow
            </h1>
            <h2
              className="font-bold leading-tight mb-5"
              style={{ fontSize: '2.5rem', color: '#2D3E9F' }}
            >
              Request.
            </h2>
            <p className="text-slate-600 leading-relaxed mb-10" style={{ fontSize: '0.9rem' }}>
              Centralize all IT change requests with<br />
              full lifecycle management, Kanban tracking,<br />
              and real-time collaboration.
            </p>

            {/* Features */}
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full border border-slate-300 bg-white/70 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <Clock size={20} className="text-slate-700" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900" style={{ fontSize: '0.9rem' }}>Real-Time Tracking</div>
                  <div className="text-slate-500" style={{ fontSize: '0.8rem', marginTop: '2px' }}>Monitor progress in real-time</div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full border border-slate-300 bg-white/70 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <Grid3x3 size={20} className="text-slate-700" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900" style={{ fontSize: '0.9rem' }}>Centralized Management</div>
                  <div className="text-slate-500" style={{ fontSize: '0.8rem', marginTop: '2px' }}>All requests in one place</div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full border border-slate-300 bg-white/70 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <Shield size={20} className="text-slate-700" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900" style={{ fontSize: '0.9rem' }}>Auditable Process</div>
                  <div className="text-slate-500" style={{ fontSize: '0.8rem', marginTop: '2px' }}>Transparent and trackable workflow</div>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM: Copyright */}
          <p className="text-slate-400" style={{ fontSize: '0.68rem' }}>
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
        <div
          className="absolute top-10 right-10 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(107,127,240,0.15), transparent)' }}
        />
        <div
          className="absolute bottom-16 left-8 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(74,144,217,0.12), transparent)' }}
        />

        {/* White login card */}
        <div className="w-full bg-white rounded-2xl shadow-2xl px-10 py-9 relative z-10" style={{ maxWidth: '400px' }}>
          <div className="mb-7 text-center">
            <h2 className="font-bold text-slate-900" style={{ fontSize: '1.55rem' }}>Welcome back</h2>
            <p className="text-slate-500 mt-1.5" style={{ fontSize: '0.875rem' }}>Sign in to your account</p>
          </div>

          <LoginForm />
        </div>

        {/* Security note — below card, on dark bg */}
        <div className="w-full mt-5 flex items-start gap-3 relative z-10" style={{ maxWidth: '400px' }}>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <div className="text-white font-semibold" style={{ fontSize: '0.875rem' }}>Your data is secure with us.</div>
            <div className="mt-0.5" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
              We use enterprise-grade security to protect your information.
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
