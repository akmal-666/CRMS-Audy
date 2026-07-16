import { Metadata } from 'next'
import { PublicTracker } from '@/features/public/public-tracker'

export const metadata: Metadata = {
  title: 'Track My Request | CRMS',
  description: 'Track the status of your submitted IT requests',
}

export default function TrackPage() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <PublicTracker />
      </div>
    </div>
  )
}
