'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { cn, STATUS_LABELS } from '@/lib/utils'

interface ParsedRow {
  rowIndex: number
  requesterName: string
  requesterEmail: string
  managerEmail: string
  departmentName: string
  vendorName: string
  title: string
  problemDescription: string
  expectedSolution: string
  priority: string
  status: string
  dueDate: string
  valid: boolean
  errors: string[]
  departmentId?: string
  vendorId?: string
}

interface ParseResult {
  total: number
  validCount: number
  errorCount: number
  rows: ParsedRow[]
}

export function MigrationView() {
  const [file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [importResult, setImportResult] = useState<any>(null)

  const parseMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const { api } = await import('@/lib/api')
      const res = await api.post<any>('/api/migration/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    },
    onSuccess: (res) => {
      setParseResult(res.data!)
      toast.success(`Parsed ${res.data!.total} rows: ${res.data!.validCount} valid, ${res.data!.errorCount} errors`)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to parse file')
    },
  })

  const importMutation = useMutation({
    mutationFn: async (rows: ParsedRow[]) => {
      const validRows = rows.filter(r => r.valid).map(r => ({
        requesterName: r.requesterName,
        requesterEmail: r.requesterEmail,
        managerEmail: r.managerEmail,
        departmentId: r.departmentId!,
        vendorId: r.vendorId!,
        title: r.title,
        problemDescription: r.problemDescription,
        expectedSolution: r.expectedSolution,
        priority: r.priority,
        status: r.status,
        dueDate: r.dueDate || undefined,
      }))
      return apiPost('/api/migration/import', { rows: validRows })
    },
    onSuccess: (res) => {
      setImportResult(res.data)
      toast.success(res.message ?? 'Import completed')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to import')
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    if (!selected.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }
    setFile(selected)
    setParseResult(null)
    setImportResult(null)
  }

  const handleParse = () => {
    if (!file) return
    parseMutation.mutate(file)
  }

  const handleImport = () => {
    if (!parseResult) return
    importMutation.mutate(parseResult.rows)
  }

  const handleReset = () => {
    setFile(null)
    setParseResult(null)
    setImportResult(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">CR Migration</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Bulk import historical change requests from CSV template
        </p>
      </div>

      {/* Step 1: Download Template */}
      <div className="card p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-primary">1</span>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">Download Template</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Use the CSV template below. Fill in your data matching the required columns.
            </p>
            <a
              href="/Template_Migration_CR.csv"
              download
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm font-medium"
            >
              <Download size={15} />
              Download Template (CSV)
            </a>
          </div>
        </div>
      </div>

      {/* Step 2: Upload */}
      <div className="card p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-primary">2</span>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">Upload Filled Template</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Upload your completed CSV file for validation
            </p>
            <div className="mt-3 space-y-3">
              <label className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/40 transition-colors cursor-pointer">
                <FileSpreadsheet size={20} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground flex-1">
                  {file ? file.name : 'Choose CSV file...'}
                </span>
                <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
              </label>
              {file && !parseResult && (
                <button
                  onClick={handleParse}
                  disabled={parseMutation.isPending}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  {parseMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  Parse & Validate
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Preview & Import */}
      <AnimatePresence>
        {parseResult && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-primary">3</span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">Review & Import</h3>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle size={15} className="text-success" />
                    <span className="text-foreground font-medium">{parseResult.validCount}</span>
                    <span className="text-muted-foreground">valid</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <XCircle size={15} className="text-destructive" />
                    <span className="text-foreground font-medium">{parseResult.errorCount}</span>
                    <span className="text-muted-foreground">errors</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Table */}
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-3 py-2 text-left font-semibold">Row</th>
                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                    <th className="px-3 py-2 text-left font-semibold">Title</th>
                    <th className="px-3 py-2 text-left font-semibold">Requester</th>
                    <th className="px-3 py-2 text-left font-semibold">Department</th>
                    <th className="px-3 py-2 text-left font-semibold">Platform</th>
                    <th className="px-3 py-2 text-left font-semibold">CR Status</th>
                    <th className="px-3 py-2 text-left font-semibold">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {parseResult.rows.map((row, i) => (
                    <tr key={i} className={cn('border-b border-border/50', row.valid ? 'hover:bg-muted/20' : 'bg-destructive/5')}>
                      <td className="px-3 py-2 text-muted-foreground">{row.rowIndex}</td>
                      <td className="px-3 py-2">
                        {row.valid ? <CheckCircle size={13} className="text-success" /> : <XCircle size={13} className="text-destructive" />}
                      </td>
                      <td className="px-3 py-2 text-foreground font-medium max-w-xs truncate">{row.title}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.requesterName}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.departmentName}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.vendorName}</td>
                      <td className="px-3 py-2">
                        <span className="badge badge-sm">{STATUS_LABELS[row.status as any] ?? row.status}</span>
                      </td>
                      <td className="px-3 py-2">
                        {row.errors.length > 0 && (
                          <div className="text-destructive text-[10px] max-w-xs">
                            {row.errors.map((e, j) => <div key={j}>• {e}</div>)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {parseResult.validCount > 0 && !importResult && (
              <div className="flex gap-3 pt-2">
                <button onClick={handleReset} className="btn-ghost text-sm">Cancel</button>
                <button
                  onClick={handleImport}
                  disabled={importMutation.isPending}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  {importMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  Import {parseResult.validCount} CR{parseResult.validCount !== 1 ? 's' : ''}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Result */}
      <AnimatePresence>
        {importResult && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5 bg-success/5 border-success/20">
            <div className="flex items-start gap-3">
              <CheckCircle size={24} className="text-success flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">Import Complete!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Successfully imported {importResult.successCount} out of {importResult.total} CRs.
                  {importResult.failCount > 0 && ` ${importResult.failCount} failed.`}
                </p>
                <button onClick={handleReset} className="btn-primary mt-3 text-sm">
                  Import Another File
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
