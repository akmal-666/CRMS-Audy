'use client'

import { FileDown } from 'lucide-react'

export function BrdTemplateDownload() {
  return (
    <a
      href="/Template%20BRD.docx"
      download="Template BRD.docx"
      className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-sm font-medium text-foreground"
    >
      <FileDown size={15} className="text-primary" />
      Download BRD Template
    </a>
  )
}
