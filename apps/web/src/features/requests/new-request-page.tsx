'use client'

import { useAuth } from '@/context/auth-context'
import { BusinessRequestForm } from './business-request-form'
import { NewRequestForm } from './new-request-form'

export function NewRequestPage() {
  const { user } = useAuth()
  const isBusinessUser = user?.role === 'business_user'

  return isBusinessUser ? <BusinessRequestForm /> : <NewRequestForm />
}
