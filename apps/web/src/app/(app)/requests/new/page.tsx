import { Metadata } from 'next'
import { NewRequestPage } from '@/features/requests/new-request-page'
import { BrdTemplateDownload } from '@/features/requests/brd-template-download'

export const metadata: Metadata = { title: 'New Request | CRMS' }

export default function NewRequestRoute() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">New Request</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Submit a new IT change request</p>
        </div>
        <BrdTemplateDownload />
      </div>
      <NewRequestPage />
    </div>
  )
}
