import { Metadata } from 'next'
import { NewRequestForm } from '@/features/requests/new-request-form'

export const metadata: Metadata = { title: 'New Request' }

export default function NewRequestPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">New Request</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Submit a new IT change request</p>
      </div>
      <NewRequestForm />
    </div>
  )
}
