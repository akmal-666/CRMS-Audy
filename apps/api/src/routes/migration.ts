import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import type { Bindings, Variables } from '../types'
import { schema } from '@crms/db'
import { ok, err } from '../lib/response'
import { generateId, generateTicketNumber } from '../lib/id'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { UserRole } from '@crms/types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// All migration routes require administrator
app.use('*', authMiddleware, requireRole(UserRole.ADMINISTRATOR))

// ─── Valid values ─────────────────────────────────────────────────────────────
const VALID_STATUSES = ['in_pipeline', 'assessment', 'development', 'uat', 'deployment', 'go_live', 'drop']
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical']

// ─── CSV Parser (no external library needed) ──────────────────────────────────
function parseCSV(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  return lines
    .filter(line => line.trim() !== '')
    .map(line => {
      const result: string[] = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
          else inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    })
}

// ─── Row validator ────────────────────────────────────────────────────────────
function validateRow(
  row: Record<string, string>,
  departments: Array<{ id: string; name: string }>,
  vendors: Array<{ id: string; name: string }>,
  rowIndex: number
): { valid: boolean; errors: string[]; departmentId?: string; vendorId?: string } {
  const errors: string[] = []

  if (!row['Requester Name']?.trim()) errors.push('Requester Name is required')
  if (!row['Requester Email']?.trim()) errors.push('Requester Email is required')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row['Requester Email'])) errors.push('Requester Email is invalid')
  if (!row['Manager Email']?.trim()) errors.push('Manager Email is required')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row['Manager Email'])) errors.push('Manager Email is invalid')
  if (!row['Request Title']?.trim()) errors.push('Request Title is required')
  if (!row['Problem Description']?.trim()) errors.push('Problem Description is required')
  if (!row['Expected Solution']?.trim()) errors.push('Expected Solution is required')

  const priority = row['Priority']?.trim().toLowerCase()
  if (!priority) errors.push('Priority is required')
  else if (!VALID_PRIORITIES.includes(priority)) errors.push(`Priority must be one of: ${VALID_PRIORITIES.join(', ')}`)

  const status = row['Status']?.trim().toLowerCase()
  if (!status) errors.push('Status is required')
  else if (!VALID_STATUSES.includes(status)) errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}`)

  const deptName = row['Department Name']?.trim()
  if (!deptName) errors.push('Department Name is required')
  const dept = departments.find(d => d.name.toLowerCase() === deptName?.toLowerCase())
  if (deptName && !dept) errors.push(`Department "${deptName}" not found in system`)

  const vendorName = row['Platform/Vendor Name']?.trim()
  if (!vendorName) errors.push('Platform/Vendor Name is required')
  const vendor = vendors.find(v => v.name.toLowerCase() === vendorName?.toLowerCase())
  if (vendorName && !vendor) errors.push(`Platform/Vendor "${vendorName}" not found in system`)

  const dueDate = row['Expected Go-Live Date']?.trim()
  if (dueDate && isNaN(Date.parse(dueDate))) errors.push('Expected Go-Live Date is invalid (use YYYY-MM-DD)')

  return {
    valid: errors.length === 0,
    errors,
    departmentId: dept?.id,
    vendorId: vendor?.id,
  }
}

// ─── POST /api/migration/parse ────────────────────────────────────────────────
// Upload CSV, parse and validate each row, return preview with errors
app.post('/parse', async (c) => {
  const db = c.get('db')

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) return c.json(err('No file uploaded'), 400)

  const fileName = file.name.toLowerCase()
  if (!fileName.endsWith('.csv')) {
    return c.json(err('Only CSV files are supported. Please use the provided template.'), 400)
  }

  const text = await file.text()
  const rows = parseCSV(text)
  if (rows.length < 2) return c.json(err('File is empty or has no data rows'), 400)

  // Build header map (case-insensitive)
  const headers = rows[0]
  const EXPECTED_HEADERS = [
    'Requester Name', 'Requester Email', 'Manager Email',
    'Department Name', 'Platform/Vendor Name', 'Request Title',
    'Problem Description', 'Expected Solution', 'Priority', 'Status', 'Expected Go-Live Date',
  ]

  // Validate headers
  const missingHeaders = EXPECTED_HEADERS.filter(
    h => !headers.some(fh => fh.toLowerCase() === h.toLowerCase())
  )
  if (missingHeaders.length > 0) {
    return c.json(err(`Missing required columns: ${missingHeaders.join(', ')}. Please use the provided template.`), 400)
  }

  // Load master data for validation
  const [departments, vendors] = await Promise.all([
    db.query.departments.findMany({ columns: { id: true, name: true } }),
    db.query.vendors.findMany({ columns: { id: true, name: true } }),
  ])

  // Parse each data row
  const dataRows = rows.slice(1)
  const parsed = dataRows.map((row, i) => {
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => { obj[h] = row[idx] ?? '' })

    const validation = validateRow(obj, departments, vendors, i + 2)

    return {
      rowIndex: i + 2,
      requesterName: obj['Requester Name']?.trim() ?? '',
      requesterEmail: obj['Requester Email']?.trim() ?? '',
      managerEmail: obj['Manager Email']?.trim() ?? '',
      departmentName: obj['Department Name']?.trim() ?? '',
      vendorName: obj['Platform/Vendor Name']?.trim() ?? '',
      title: obj['Request Title']?.trim() ?? '',
      problemDescription: obj['Problem Description']?.trim() ?? '',
      expectedSolution: obj['Expected Solution']?.trim() ?? '',
      priority: obj['Priority']?.trim().toLowerCase() ?? 'medium',
      status: obj['Status']?.trim().toLowerCase() ?? 'in_pipeline',
      dueDate: obj['Expected Go-Live Date']?.trim() ?? '',
      valid: validation.valid,
      errors: validation.errors,
      departmentId: validation.departmentId,
      vendorId: validation.vendorId,
    }
  })

  const validCount = parsed.filter(r => r.valid).length
  const errorCount = parsed.filter(r => !r.valid).length

  return c.json(ok({
    total: parsed.length,
    validCount,
    errorCount,
    rows: parsed,
    departments,
    vendors,
  }))
})

// ─── POST /api/migration/import ───────────────────────────────────────────────
// Import only valid rows as work items
app.post('/import', async (c) => {
  const db = c.get('db')
  const user = c.get('user')!

  const body = await c.req.json() as {
    rows: Array<{
      requesterName: string
      requesterEmail: string
      managerEmail: string
      departmentId: string
      vendorId: string
      title: string
      problemDescription: string
      expectedSolution: string
      priority: string
      status: string
      dueDate?: string
    }>
  }

  if (!body.rows?.length) return c.json(err('No rows to import'), 400)

  // Generate ticket counter
  const year = new Date().getFullYear()
  const counterResult = await c.env.DB.prepare(
    'SELECT counter FROM ticket_counters WHERE year = ?'
  ).bind(year).first<{ counter: number }>()

  let counter = counterResult?.counter ?? 0
  if (!counterResult) {
    await c.env.DB.prepare(
      'INSERT INTO ticket_counters (year, counter) VALUES (?, 0)'
    ).bind(year).run()
  }

  const results: Array<{ ticketNumber: string; title: string; success: boolean; error?: string }> = []

  for (const row of body.rows) {
    try {
      counter++
      const ticketNumber = generateTicketNumber(year, counter)
      const id = generateId()
      const now = new Date()

      await db.insert(schema.workItems).values({
        id,
        ticketNumber,
        title: row.title,
        description: row.problemDescription,
        problemDescription: row.problemDescription,
        expectedSolution: row.expectedSolution,
        departmentId: row.departmentId,
        vendorId: row.vendorId,
        managerEmail: row.managerEmail,
        priority: row.priority as any,
        status: row.status as any,
        requesterName: row.requesterName,
        requesterEmail: row.requesterEmail,
        dueDate: row.dueDate ? new Date(row.dueDate) : undefined,
        createdAt: now,
        updatedAt: now,
      })

      // Update counter in DB
      await c.env.DB.prepare(
        'UPDATE ticket_counters SET counter = ? WHERE year = ?'
      ).bind(counter, year).run()

      // Activity log
      await db.insert(schema.activityLogs).values({
        id: generateId(),
        workItemId: id,
        userId: user.sub,
        action: 'created',
        description: `Imported via bulk migration by ${user.name ?? user.email}`,
        metadata: { source: 'migration', importedBy: user.sub },
        createdAt: now,
      })

      results.push({ ticketNumber, title: row.title, success: true })
    } catch (e: any) {
      results.push({ ticketNumber: '', title: row.title, success: false, error: e.message })
      // Roll back counter on failure
      counter--
    }
  }

  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length

  return c.json(ok({
    total: body.rows.length,
    successCount,
    failCount,
    results,
  }, `Import complete: ${successCount} created, ${failCount} failed`))
})

export default app
