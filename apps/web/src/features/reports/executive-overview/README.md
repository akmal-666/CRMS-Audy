# Executive Overview Report Module

## Overview
Sub modul Executive Overview menyediakan dashboard komprehensif untuk melihat performa portfolio project dan status delivery secara high-level.

## Fitur Utama

### 1. **KPI Cards (6 Metrics)**
- Total Requests - Total permintaan dalam periode
- Active Projects - Project yang sedang berjalan
- Completed - Project yang sudah selesai
- Delayed - Project yang terlambat
- Avg Cycle Time - Rata-rata waktu penyelesaian
- SLA Achievement - Persentase pencapaian SLA

### 2. **Visualisasi Data**

#### Requests by Status (Pie Chart)
- Menampilkan distribusi request berdasarkan status
- Status: In Pipeline, Assessment, Development, UAT, Deployment, Completed, Cancelled, On Hold

#### Created vs Completed Trend (Line Chart)
- Trend bulanan request yang dibuat vs diselesaikan
- Menampilkan data 6 bulan terakhir

#### Project Progress (Top 5)
- Daftar 5 project dengan progress tertinggi
- Progress bar dengan warna berdasarkan status

#### Timeline / Roadmap Overview
- Timeline project yang sedang berjalan
- Indikator: On Track, At Risk, Milestone
- Menampilkan tanggal mulai dan target selesai

#### Requests by Priority (Pie Chart)
- Distribusi request berdasarkan prioritas
- Priority: Critical, High, Medium, Low

#### SLA Achievement (Donut Chart)
- Persentase Within SLA vs Over SLA
- Breakdown jumlah detail

#### Workload by Assignee (Top 5)
- Workload 5 developer teratas
- Kolom: Assigned, Completed, Remaining, Utilization

#### Average Cycle Time by Stage (Bar Chart)
- Rata-rata waktu per tahap: Assessment, Development, UAT, Deployment

#### Recent Activity (Timeline)
- 10 aktivitas terakhir dengan timestamp
- Menampilkan action dan user yang melakukan

#### Projects Health Summary (Table)
- Tabel lengkap status kesehatan project
- Kolom: Project, Progress, Status, Health, Priority, Issues, Avg Cycle Time, SLA

## Filter

### Filter Periode
- **Year**: Filter per tahun
- **Quarter**: Filter per kuartal (Q1-Q4)
- **Month**: Filter per bulan
- **Custom**: Range tanggal custom

### Filter Tambahan
- **Department**: Filter berdasarkan departemen
- **Vendor/Platform**: Filter berdasarkan vendor

## Export Features

### 1. Export to Excel
- Export data lengkap dalam format CSV (kompatibel Excel)
- Mencakup semua data raw dari report

### 2. Export to CSV
- Export data detail dalam format CSV
- Field: ticketNumber, title, status, priority, department, vendor, dates

### 3. Export to PDF
- Generate PDF printable
- Mencakup KPI summary dan tabel breakdown
- Otomatis membuka print dialog

## API Endpoint

### GET `/api/reports/executive-overview`

**Query Parameters:**
```typescript
{
  startDate?: string       // Format: YYYY-MM-DD
  endDate?: string         // Format: YYYY-MM-DD
  departmentId?: string
  vendorId?: string
  year?: string           // Format: YYYY
  quarter?: string        // 1-4
  month?: string          // 1-12
}
```

**Response:**
```typescript
{
  summary: {
    totalRequests: number
    activeProjects: number
    completed: number
    delayed: number
    avgCycleTimeDays: number
    slaAchievement: number
  }
  requestsByStatus: Array<{ status, count, percentage }>
  requestsByPriority: Array<{ priority, count, percentage }>
  monthlyTrend: Array<{ month, created, completed }>
  projectProgress: Array<{ name, ticketNumber, progress, status }>
  timelineProjects: Array<{ name, ticketNumber, startDate, endDate, status, isAtRisk, isDelayed, milestone }>
  slaBreakdown: { withinSLA, overSLA, percentage }
  workloadByAssignee: Array<{ name, assigned, completed, remaining, utilization }>
  avgCycleTimeByStage: Array<{ stage, avgDays }>
  recentActivity: Array<{ ticketNumber, action, description, createdAt, userName }>
  projectsHealth: Array<{ name, ticketNumber, progress, status, health, priority, openIssues, inProgressIssues, doneIssues, avgCycleTime, sla }>
  _exportData: { items: Array<...> }
}
```

## Komponen

### Main Components
- `executive-overview-page.tsx` - Halaman utama
- `overview-kpi-cards.tsx` - KPI Cards
- `status-chart.tsx` - Pie chart status
- `trend-chart.tsx` - Line chart trend
- `project-progress-list.tsx` - Daftar progress project
- `timeline-roadmap.tsx` - Timeline roadmap
- `priority-chart.tsx` - Pie chart priority
- `sla-chart.tsx` - Donut chart SLA
- `workload-chart.tsx` - Tabel workload
- `cycle-time-chart.tsx` - Bar chart cycle time
- `recent-activity.tsx` - Timeline aktivitas
- `project-health-table.tsx` - Tabel health summary

### Shared Components
- `report-filters.tsx` - Filter component (shared)

## Route
- `/reports/executive-overview`

## Akses
Role yang dapat mengakses:
- Administrator
- Manager
- Business Analyst

## Tech Stack
- **React Query** - Data fetching & caching
- **Recharts** - Chart library
- **Framer Motion** - Animations
- **date-fns** - Date formatting
- **Tailwind CSS** - Styling

## Future Enhancements
- [ ] Drill-down capability per chart
- [ ] Comparison dengan periode sebelumnya
- [ ] Export to PowerPoint
- [ ] Real-time updates dengan WebSocket
- [ ] Customizable dashboard widgets
- [ ] Scheduled email reports
