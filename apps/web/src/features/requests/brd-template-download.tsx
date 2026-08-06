'use client'

import { FileDown } from 'lucide-react'

export function BrdTemplateDownload() {
  const handleDownload = () => {
    const brdContent = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>Business Requirements Document (BRD)</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>90</w:Zoom>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; margin: 2cm; color: #1a1a1a; }
    h1 { font-size: 18pt; color: #2563EB; text-align: center; border-bottom: 2px solid #2563EB; padding-bottom: 8px; margin-bottom: 6px; }
    h2 { font-size: 13pt; color: #1d4ed8; background: #EFF6FF; padding: 6px 10px; border-left: 4px solid #2563EB; margin-top: 20px; }
    h3 { font-size: 11pt; color: #374151; margin-top: 12px; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10.5pt; }
    th { background: #2563EB; color: white; padding: 8px 10px; text-align: left; font-weight: bold; }
    td { padding: 7px 10px; border: 1px solid #D1D5DB; vertical-align: top; }
    tr:nth-child(even) td { background: #F9FAFB; }
    .info-table td:first-child { font-weight: bold; background: #EFF6FF; width: 35%; }
    .input-field { background: #FFFBEB; min-height: 20px; }
    .section-note { font-size: 9.5pt; color: #6B7280; font-style: italic; margin-bottom: 8px; }
    .footer { margin-top: 40px; border-top: 1px solid #D1D5DB; padding-top: 10px; font-size: 9pt; color: #9CA3AF; text-align: center; }
    p { margin: 4px 0; line-height: 1.5; }
    .watermark-row td { background: #FEF3C7 !important; font-style: italic; color: #92400E; font-size: 9pt; }
  </style>
</head>
<body>

<h1>BUSINESS REQUIREMENTS DOCUMENT (BRD)</h1>
<p style="text-align:center; color:#6B7280; font-size:10pt;">IT Change Request — Audy Dental Management System</p>
<p style="text-align:center; color:#9CA3AF; font-size:9pt;">Version 1.0 &nbsp;|&nbsp; Tanggal: _______________</p>

<!-- ─── 1. INFORMASI UMUM ─── -->
<h2>1. Informasi Umum</h2>
<table class="info-table">
  <tr><td>Nama Pengusul</td><td class="input-field">&nbsp;</td></tr>
  <tr><td>Email Pengusul</td><td class="input-field">&nbsp;</td></tr>
  <tr><td>Departemen</td><td class="input-field">&nbsp;</td></tr>
  <tr><td>Email Manager</td><td class="input-field">&nbsp;</td></tr>
  <tr><td>Tanggal Pengajuan</td><td class="input-field">&nbsp;</td></tr>
  <tr><td>Target Go-Live</td><td class="input-field">&nbsp;</td></tr>
  <tr><td>Platform / Vendor</td><td class="input-field">&nbsp;</td></tr>
  <tr><td>Prioritas</td><td class="input-field">[ ] Low &nbsp; [ ] Medium &nbsp; [ ] High &nbsp; [ ] Critical</td></tr>
</table>

<!-- ─── 2. JUDUL REQUEST ─── -->
<h2>2. Judul Request / Change Request</h2>
<p class="section-note">Tuliskan judul singkat yang menggambarkan perubahan yang diinginkan (maks. 200 karakter)</p>
<table>
  <tr><td class="input-field" style="height:40px;">&nbsp;</td></tr>
</table>

<!-- ─── 3. LATAR BELAKANG ─── -->
<h2>3. Latar Belakang & Deskripsi Masalah</h2>
<p class="section-note">Jelaskan kondisi saat ini, masalah yang dihadapi, dan mengapa perubahan ini diperlukan.</p>
<table>
  <tr><td class="input-field" style="height:100px;">&nbsp;</td></tr>
</table>

<!-- ─── 4. SOLUSI YANG DIHARAPKAN ─── -->
<h2>4. Solusi / Output yang Diharapkan</h2>
<p class="section-note">Deskripsikan hasil akhir yang diinginkan setelah perubahan diimplementasikan.</p>
<table>
  <tr><td class="input-field" style="height:100px;">&nbsp;</td></tr>
</table>

<!-- ─── 5. SCOPE ─── -->
<h2>5. Scope & Ruang Lingkup</h2>
<h3>5.1 In Scope (Termasuk dalam pengerjaan)</h3>
<table>
  <tr><th>No</th><th>Deskripsi</th></tr>
  <tr class="watermark-row"><td>1</td><td>Isi di sini...</td></tr>
  <tr><td>2</td><td class="input-field">&nbsp;</td></tr>
  <tr><td>3</td><td class="input-field">&nbsp;</td></tr>
  <tr><td>4</td><td class="input-field">&nbsp;</td></tr>
</table>

<h3>5.2 Out of Scope (Tidak termasuk dalam pengerjaan)</h3>
<table>
  <tr><th>No</th><th>Deskripsi</th></tr>
  <tr class="watermark-row"><td>1</td><td>Isi di sini...</td></tr>
  <tr><td>2</td><td class="input-field">&nbsp;</td></tr>
  <tr><td>3</td><td class="input-field">&nbsp;</td></tr>
</table>

<!-- ─── 6. KEBUTUHAN FUNGSIONAL ─── -->
<h2>6. Kebutuhan Fungsional (Functional Requirements)</h2>
<p class="section-note">Rincikan setiap fitur / fungsi yang dibutuhkan secara detail.</p>
<table>
  <tr><th>FR-ID</th><th>Deskripsi Kebutuhan</th><th>Prioritas</th><th>Keterangan</th></tr>
  <tr class="watermark-row"><td>FR-001</td><td>Isi di sini...</td><td>High</td><td>&nbsp;</td></tr>
  <tr><td>FR-002</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td></tr>
  <tr><td>FR-003</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td></tr>
  <tr><td>FR-004</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td></tr>
  <tr><td>FR-005</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td></tr>
</table>

<!-- ─── 7. KEBUTUHAN NON-FUNGSIONAL ─── -->
<h2>7. Kebutuhan Non-Fungsional</h2>
<table>
  <tr><th>NFR-ID</th><th>Kategori</th><th>Deskripsi</th></tr>
  <tr class="watermark-row"><td>NFR-001</td><td>Performance</td><td>Isi di sini...</td></tr>
  <tr><td>NFR-002</td><td>Security</td><td class="input-field">&nbsp;</td></tr>
  <tr><td>NFR-003</td><td>Usability</td><td class="input-field">&nbsp;</td></tr>
  <tr><td>NFR-004</td><td>Integration</td><td class="input-field">&nbsp;</td></tr>
</table>

<!-- ─── 8. USER STORIES ─── -->
<h2>8. User Stories</h2>
<p class="section-note">Format: "Sebagai [role], saya ingin [aksi] agar [tujuan/manfaat]"</p>
<table>
  <tr><th>US-ID</th><th>Role</th><th>Aksi</th><th>Tujuan</th><th>Acceptance Criteria</th></tr>
  <tr class="watermark-row"><td>US-001</td><td>User</td><td>Isi di sini...</td><td>Isi di sini...</td><td>Isi di sini...</td></tr>
  <tr><td>US-002</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td></tr>
  <tr><td>US-003</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td></tr>
</table>

<!-- ─── 9. DAMPAK & RISIKO ─── -->
<h2>9. Analisis Dampak & Risiko</h2>
<table>
  <tr><th>No</th><th>Modul / Sistem Terdampak</th><th>Risiko</th><th>Mitigasi</th></tr>
  <tr class="watermark-row"><td>1</td><td>Isi di sini...</td><td>Isi di sini...</td><td>Isi di sini...</td></tr>
  <tr><td>2</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td></tr>
  <tr><td>3</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td></tr>
</table>

<!-- ─── 10. ESTIMASI MANDAYS ─── -->
<h2>10. Estimasi Kebutuhan & Mandays</h2>
<table>
  <tr><th>Role</th><th>Nama</th><th>Estimasi Mandays</th><th>Keterangan</th></tr>
  <tr><td>Business Analyst</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td></tr>
  <tr><td>Developer</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td></tr>
  <tr><td>QA / Tester</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td></tr>
  <tr><td>DevOps</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td></tr>
  <tr style="font-weight:bold; background:#EFF6FF;"><td colspan="2">Total Estimasi Mandays</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td></tr>
</table>

<!-- ─── 11. LAMPIRAN ─── -->
<h2>11. Lampiran & Referensi</h2>
<p class="section-note">Daftar dokumen pendukung, mockup, screenshot, atau link referensi yang relevan.</p>
<table>
  <tr><th>No</th><th>Nama Dokumen</th><th>Keterangan</th></tr>
  <tr class="watermark-row"><td>1</td><td>Isi di sini...</td><td>Isi di sini...</td></tr>
  <tr><td>2</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td></tr>
  <tr><td>3</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td></tr>
</table>

<!-- ─── 12. PERSETUJUAN ─── -->
<h2>12. Persetujuan</h2>
<table>
  <tr><th>Peran</th><th>Nama</th><th>Tanda Tangan</th><th>Tanggal</th></tr>
  <tr><td>Pengusul / Requester</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td></tr>
  <tr><td>Manager</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td></tr>
  <tr><td>Business Analyst</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td></tr>
  <tr><td>IT Manager</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td><td class="input-field">&nbsp;</td></tr>
</table>

<div class="footer">
  IT Workflow — Audy Dental &nbsp;|&nbsp; Business Requirements Document Template &nbsp;|&nbsp; Dokumen ini bersifat rahasia
</div>

</body>
</html>
`

    // Create blob and trigger download as .doc (Word-compatible HTML)
    const blob = new Blob([brdContent], { type: 'application/msword' })
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
