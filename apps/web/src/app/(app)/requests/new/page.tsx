import { Metadata } from 'next'
import { NewRequestPage } from '@/features/requests/new-request-page'

export const metadata: Metadata = { title: 'New Request | CRMS' }

export default function NewRequestRoute() {
  return <NewRequestPage />
}
