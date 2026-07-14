import { Metadata } from 'next'
import { TicketDetailPage } from '@/features/tickets/ticket-detail-page'

export const metadata: Metadata = { title: 'Request Detail' }

export default function RequestDetailPage({ params }: { params: { id: string } }) {
  return <TicketDetailPage id={params.id} />
}
