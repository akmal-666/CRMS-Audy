import { Metadata } from 'next'
import { PublicTimelinePage } from '@/features/timeline/timeline-page'

export const metadata: Metadata = {
  title: 'Project Timeline | CRMS',
  description: 'View project timeline',
}

export default async function PublicTimelineRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <PublicTimelinePage token={token} />
}
