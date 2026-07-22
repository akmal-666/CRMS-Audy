import { Metadata } from 'next'
import { NewRequestPage } from '@/features/requests/new-request-page'
import Link from 'next/link'
import { FileDown } from 'lucide-react'

export const metadata: Metadata = { title: 'New Request | CRMS' }

export default function NewRequestRoute() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">New Request</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Submit a new IT change request</p>
        </div>
        <Link
          href="/BRD-Template.html"
          target="_blank"
          download="BRD-Template.html"
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-sm font-medium text-foreground"
        >
          <FileDown size={15} className="text-primary" />
          Download BRD Template
        </Link>
      </div>
      <NewRequestPage />
    </div>
  )
}
