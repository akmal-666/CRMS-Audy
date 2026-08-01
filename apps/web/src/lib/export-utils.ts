/**
 * Export utilities for reports
 */

/**
 * Export data to Excel format
 */
export function exportToExcel(data: any, filename: string) {
  // For now, we'll use CSV as Excel format
  // In production, you might want to use a library like xlsx
  const exportData = data._exportData?.items || []
  
  if (exportData.length === 0) {
    alert('No data to export')
    return
  }

  // Convert to CSV
  const headers = Object.keys(exportData[0])
  const csvContent = [
    headers.join(','),
    ...exportData.map((row: any) =>
      headers.map(header => {
        const value = row[header]
        if (value === null || value === undefined) return ''
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`
        }
        return value
      }).join(',')
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  link.click()
}

/**
 * Export data to CSV format
 */
export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert('No data to export')
    return
  }

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header]
        if (value === null || value === undefined) return ''
        
        // Handle dates
        if (value instanceof Date) {
          return value.toISOString()
        }
        
        // Handle strings with commas or quotes
        if (typeof value === 'string') {
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`
          }
        }
        
        return value
      }).join(',')
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  link.click()
}

/**
 * Export report to PDF format
 */
export function exportToPDF(reportData: any, title: string, filters: any) {
  // Create a printable version
  const printWindow = window.open('', '_blank')
  
  if (!printWindow) {
    alert('Please allow popups to export PDF')
    return
  }

  const summary = reportData.summary || {}
  const statusData = reportData.requestsByStatus || []
  const priorityData = reportData.requestsByPriority || []

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          color: #333;
        }
        h1 {
          color: #1e40af;
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 10px;
        }
        h2 {
          color: #1e40af;
          margin-top: 30px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin: 20px 0;
        }
        .kpi-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
          background: #f9fafb;
        }
        .kpi-label {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          font-weight: 600;
        }
        .kpi-value {
          font-size: 32px;
          font-weight: bold;
          color: #1e40af;
          margin: 10px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #e5e7eb;
          padding: 12px;
          text-align: left;
        }
        th {
          background: #f3f4f6;
          font-weight: 600;
          color: #374151;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #6b7280;
        }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p style="color: #6b7280; margin-bottom: 30px;">
        Generated on ${new Date().toLocaleString()} | 
        Filter: ${JSON.stringify(filters)}
      </p>

      <h2>Executive Summary</h2>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total Requests</div>
          <div class="kpi-value">${summary.totalRequests || 0}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Active Projects</div>
          <div class="kpi-value">${summary.activeProjects || 0}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Completed</div>
          <div class="kpi-value">${summary.completed || 0}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Delayed</div>
          <div class="kpi-value">${summary.delayed || 0}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Avg Cycle Time</div>
          <div class="kpi-value">${summary.avgCycleTimeDays || 0} days</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">SLA Achievement</div>
          <div class="kpi-value">${summary.slaAchievement || 0}%</div>
        </div>
      </div>

      <h2>Requests by Status</h2>
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Count</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          ${statusData.map((item: any) => `
            <tr>
              <td>${item.status}</td>
              <td>${item.count}</td>
              <td>${item.percentage}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h2>Requests by Priority</h2>
      <table>
        <thead>
          <tr>
            <th>Priority</th>
            <th>Count</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          ${priorityData.map((item: any) => `
            <tr>
              <td style="text-transform: capitalize">${item.priority}</td>
              <td>${item.count}</td>
              <td>${item.percentage}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>This report was generated automatically by the CRMS system.</p>
      </div>

      <div class="no-print" style="margin-top: 30px;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
          Print / Save as PDF
        </button>
        <button onclick="window.close()" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; margin-left: 10px;">
          Close
        </button>
      </div>
    </body>
    </html>
  `

  printWindow.document.write(html)
  printWindow.document.close()
}
