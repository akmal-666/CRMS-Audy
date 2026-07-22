'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { DashboardView } from '@/features/dashboard/dashboard-view'

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user?.role === 'business_user') {
      router.replace('/kanban')
    }
  }, [user, isLoading, router])

  // Show nothing while redirecting
  if (!isLoading && user?.role === 'business_user') {
    return null
  }

  return <DashboardView />
}
