'use client'

import { FileDown } from 'lucide-react'
import { useEffect, useState } from 'react'

export function BrdTemplateDownload() {
  const [useDirectLink, setUseDirectLink] = useState(true)

  useEffect(() => {
    // Check if the static file exists, fall back to generated version if not
    fetch('/Template BRD.docx', { method: 'HEAD' })
      .then(res => setUseDirectLink(res.ok))
      .catch(() => setUseDirectLink(false))
  }, [])

  if (useDirectLink) {
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

  // Fallback: generate from template matching the original document structure
  const handleDownload = () => {
    const content = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>Change Request (CR) Form</title>
  <!--[if gte mso 9]>
  <xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml>
  <![endif]-->
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; margin: 2.5cm; color: #000; }
    h1 { font-size: 16pt; font-weight: bold; margin-bottom: 20px; }
    h2 { font-size: 12pt; font-weight: bold; margin-top: 20px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    td, th { border: 1px solid #000; padding: 5px 8px; vertical-align: top; }
    th { font-weight: bold; background: #f2f2f2; }
    .large-empty { min-height: 120px; }
  </style>
</head>
<body>
<h1>Change Request (CR) Form</h1>

<h2>1. General Information</h2>
<table>
  <tr><td style="width:40%">CR ID</td><td>&nbsp;</td></tr>
  <tr><td>Requestor Name</td><td>&nbsp;</td></tr>
  <tr><td>Department</td><td>&nbsp;</td></tr>
  <tr><td>Date Submitted</td><td>&nbsp;</td></tr>
  <tr><td>Priority</td><td>&nbsp;</td></tr>
  <tr><td>Approval Status</td><td>&nbsp;</td></tr>
</table>

<h2>2. Background</h2>
<p>[Describe the current situation or problem that requires the change. Include any relevant context, issues, or business needs.]</p>
<table><tr><td class="large-empty">&nbsp;</td></tr></table>

<h2>3. Objective</h2>
<p>[Explain the goal of the change and the expected outcome]</p>
<table><tr><td class="large-empty">&nbsp;</td></tr></table>

<h2>4. Scope</h2>
<table><tr><td class="large-empty">&nbsp;</td></tr></table>

<h2>5. Impacted System</h2>
<table>
  <tr><th style="width:8%">No</th><th style="width:30%">System / Application</th><th>Impact Description</th></tr>
  <tr><td>1</td><td>CIS</td><td style="min-height:40px">&nbsp;</td></tr>
</table>

<h2>6. Risk &amp; Mitigation</h2>
<table>
  <tr><th style="width:8%">No</th><th>Risk</th><th>Impact</th><th>Mitigation Plan</th></tr>
  <tr><td>1</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
  <tr><td>2</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
  <tr><td>3</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
  <tr><td>4</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
</table>

<h2>7. Approval</h2>
<table>
  <tr><th style="width:25%">Role</th><th>Name</th><th>Signature</th><th>Date</th></tr>
  <tr><td>Requestor</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
  <tr><td>BU Approver 1</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
  <tr><td>BU Approver 2</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
  <tr><td>IT Approver</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
  <tr><td>Business Analyst</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
  <tr><td>Technical Lead</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
</table>
</body>
</html>`

    const blob = new Blob([content], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'Template BRD.doc'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleDownload}
      className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-sm font-medium text-foreground"
    >
      <FileDown size={15} className="text-primary" />
      Download BRD Template
    </button>
  )
}
