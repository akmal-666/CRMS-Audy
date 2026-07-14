import { Metadata } from 'next'
import { TicketDetailPage } from '@/features/tickets/ticket-detail-page'

export const metadata: Metadata = { title: 'Request Detail' }

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TicketDetailPage id={id} />
}