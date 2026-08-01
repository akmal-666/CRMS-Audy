import { Metadata } from 'next'
import { TimelineModule } from '@/features/timeline/timeline-module'

export const metadata: Metadata = { title: 'Timeline | CRMS' }

export default function TimelineModulePage() {
  return <TimelineModule />
}
