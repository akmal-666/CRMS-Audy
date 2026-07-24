import { Metadata } from 'next'
import { TimelinePage } from '@/features/timeline/timeline-page'

export const metadata: Metadata = { title: 'Timeline | CRMS' }

export default async function TimelineRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TimelinePage workItemId={id} />
}
