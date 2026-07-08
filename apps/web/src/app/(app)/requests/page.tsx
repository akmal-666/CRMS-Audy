import { Metadata } from 'next'
import { RequestsView } from '@/features/requests/requests-view'

export const metadata: Metadata = { title: 'All Requests' }

export default function RequestsPage() {
  return <RequestsView />
}
