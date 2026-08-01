'use client'

import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user) {
      // Only allow administrator, manager, and business_analyst
      const allowedRoles = ['administrator', 'manager', 'business_analyst']
      if (!allowedRoles.includes(user.role)) {
        // Redirect unauthorized users to dashboard
        router.push('/dashboard')
      }
    }
  }, [user, isLoading, router])

  // Show loading or nothing while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Only render children if user has correct role
  const allowedRoles = ['administrator', 'manager', 'business_analyst']
  if (!user || !allowedRoles.includes(user.role)) {
    return null
  }

  return <>{children}</>
}
