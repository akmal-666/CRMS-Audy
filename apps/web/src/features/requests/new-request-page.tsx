'use client'

import { useAuth } from '@/context/auth-context'
import { BusinessRequestForm } from './business-request-form'
import { NewRequestForm } from './new-request-form'

export function NewRequestPage() {
  const { user } = useAuth()
  const isBusinessUser = user?.role === 'business_user'

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">New Request</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Submit a new IT change request</p>
      </div>
      {isBusinessUser ? <BusinessRequestForm /> : <NewRequestForm />}
    </div>
  )
}
