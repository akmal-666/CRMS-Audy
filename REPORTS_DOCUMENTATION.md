# 📊 Reports Documentation - IT Workflow System

Dokumentasi lengkap untuk membaca dan menginterpretasi data di semua report yang tersedia dalam sistem IT Workflow Management.

---

## 📑 Daftar Isi

1. [Executive Overview Report](#1-executive-overview-report)
2. [Project Health Report](#2-project-health-report)
3. [Mandays Report](#3-mandays-report)
4. [Dashboard Report](#4-dashboard-report)
5. [Filter Options](#5-filter-options)
6. [Business Days Calculation](#6-business-days-calculation)
7. [Export Options](#7-export-options)

---

## 1. Executive Overview Report

**Path:** `/reports/executive-overview`

**Tujuan:** High-level summary untuk manajemen eksekutif, menampilkan KPI utama dan status keseluruhan portfolio project.

### 1.1 KPI Cards (Summary Metrics)

| Metric | Deskripsi | Cara Baca | Target |
|--------|-----------|-----------|--------|
| **Total Requests** | Jumlah total CR dalam periode | Semua status kecuali drop | - |
| **Active Projects** | CR yang sedang dikerjakan | Status: assessment, development, uat, deployment | Semakin banyak = workload tinggi |
| **Completed** | CR yang sudah go live | Status: go_live | Semakin banyak = produktif |
| **Delayed** | CR yang melewati due date | Due date < Today & status ≠ go_live | Target: 0 atau minimal |
| **Avg Cycle Time** | Rata-rata waktu penyelesaian | **Business days** dari created → go_live | Target: < 30 hari kerja |
| **SLA Achievement** | Persentase CR yang sesuai SLA | Business days ≤ SLA target | Target: ≥ 80% |

**SLA Targets (Business Days):**
- Critical priority: 15 hari kerja
- High priority: 30 hari kerja
- Medium/Low priority: 60 hari kerja

### 1.2 Status Breakdown Chart (Donut)

Menampilkan distribusi CR berdasarkan workflow status:

| Status | Keterangan | Warna |
|--------|------------|-------|
| In Pipeline | Belum dikerjakan, waiting approval | Gray |
| Assessment | Fase analisa kebutuhan | Blue |
| Development | Sedang development/coding | Purple |
| UAT | User Acceptance Testing | Orange |
| Deployment | Siap deploy ke production | Yellow |
| Go Live | Sudah live di production | Green |
| Drop | Dibatalkan/ditolak | Red |

**Cara Baca:**
- Persentase menunjukkan proporsi dari total requests
- Hover/click untuk lihat jumlah aktual
- Dominan "Development" = banyak pekerjaan teknis
- Dominan "In Pipeline" = bottleneck di approval

### 1.3 Monthly Trend Chart (Line)

Menampilkan trend 6 bulan terakhir:

| Series | Deskripsi |
|--------|-----------|
| **Created** (Blue line) | Jumlah CR baru yang dibuat per bulan |
| **Completed** (Green line) | Jumlah CR yang go live per bulan |

**Cara Baca:**
- Created > Completed = backlog bertambah
- Completed > Created = backlog berkurang
- Gap besar = tim overload atau estimasi kurang tepat

### 1.4 Priority Distribution Chart (Bar)

Distribusi berdasarkan priority level:

| Priority | SLA Target | Warna |
|----------|------------|-------|
| Critical | 15 hari kerja | Red |
| High | 30 hari kerja | Orange |
| Medium | 60 hari kerja | Yellow |
| Low | 60 hari kerja | Gray |

**Cara Baca:**
- Banyak Critical/High = urgensi tinggi, perlu resource lebih
- Dominan Medium/Low = workload normal

### 1.5 SLA Breakdown (Gauge/Progress)

| Metric | Rumus | Target |
|--------|-------|--------|
| Within SLA | CR dengan cycle time ≤ SLA target | ≥ 80% |
| Over SLA | CR dengan cycle time > SLA target | ≤ 20% |
| Percentage | (Within SLA / Total Completed) × 100% | ≥ 80% |

**Interpretasi:**
- 80-100%: Excellent performance
- 60-79%: Good, perlu improvement
- 40-59%: At risk, butuh action plan
- <40%: Critical, urgent intervention needed

### 1.6 Workload by Assignee (Bar Chart)

Top 5 developer dengan workload terbanyak:

| Column | Keterangan |
|--------|------------|
| Assigned | Total CR yang di-assign ke developer |
| Completed | CR yang sudah selesai (go_live) |
| Remaining | CR yang masih dikerjakan |
| Utilization | (Remaining / Assigned) × 100% |

**Cara Baca:**
- Utilization > 80% = developer overload
- Utilization < 50% = capacity tersedia
- Digunakan untuk load balancing

### 1.7 Avg Cycle Time by Stage (Bar)

Rata-rata waktu per stage workflow (business days):

| Stage | Deskripsi | Benchmark |
|-------|-----------|-----------|
| Assessment | Analisa requirement → dev start | 3-5 hari |
| Development | Coding + unit test | 10-20 hari |
| UAT | User testing + bug fixing | 3-7 hari |
| Deployment | Deploy ke production | 1-3 hari |

**Cara Baca:**
- Stage dengan avg tertinggi = bottleneck
- Bandingkan dengan benchmark untuk evaluasi

### 1.8 Project Progress List

Top 5 project aktif dengan progress tertinggi:

| Field | Keterangan |
|-------|------------|
| Ticket Number | ID unik CR |
| Progress | Estimasi berdasarkan stage (0-100%) |
| Status | Current workflow stage |

**Progress Mapping:**
- Assessment: 20%
- Development: 40%
- UAT: 70%
- Deployment: 90%
- Go Live: 100%

### 1.9 Timeline/Roadmap

5 project aktif dengan timeline:

| Field | Keterangan |
|-------|------------|
| Start Date | Created date |
| End Date | Target go live atau due date |
| Status | Current stage |
| At Risk | Due date terlewati tapi belum selesai |
| Delayed | Melewati due date |

**Visual Indicators:**
- 🟢 On track
- 🟡 At risk (mendekati due date)
- 🔴 Delayed (melewati due date)

### 1.10 Projects Health Table

Semua project aktif dengan health metrics:

| Column | Rumus | Interpretasi |
|--------|-------|--------------|
| Progress | Stage-based percentage | - |
| Health | Algorithm berdasarkan risk + delay | Good / At Risk / Critical |
| Priority | CR priority level | - |
| Avg Cycle Time | Business days sejak created | - |
| SLA Status | On-time jika ≤ target | On-time / Overdue |

**Health Algorithm:**
- Critical: Delayed + High Priority + High Risk
- At Risk: Delayed OR High Priority OR High Risk
- Good: Tidak ada indikator negatif

### 1.11 Mandays per Vendor

Resource allocation per vendor/platform:

| Column | Keterangan |
|--------|------------|
| Vendor Name | Nama platform (Oracle, SAP, Cobol, dll) |
| Planned | Total estimated mandays dari assessment |
| Used | Total mandays aktual yang sudah digunakan |
| Top-up | Additional mandays allocation |
| Total | Planned + Top-up |
| Remaining | Total - Used |
| Utilization % | (Used / Total) × 100% |
| Project Count | Jumlah CR untuk vendor ini |

**Cara Baca:**
- Remaining < 0 = over budget, perlu top-up
- Utilization > 90% = hampir habis, plan top-up
- Utilization < 50% = masih banyak tersedia

### 1.12 Recent Activity

10 aktivitas terakhir dari semua project:

| Field | Keterangan |
|-------|------------|
| Ticket Number | CR ID |
| Action | Tipe aktivitas (created, status_changed, assigned, dll) |
| Description | Detail aktivitas |
| User | Yang melakukan aktivitas |
| Created At | Timestamp |

---

## 2. Project Health Report

**Path:** `/reports/project-health`

**Tujuan:** Analisa mendalam kesehatan project untuk risk management dan early warning.

### 2.1 Health KPI Cards

| Metric | Deskripsi | Target |
|--------|-----------|--------|
| Total Projects | Project aktif (exclude go_live, drop, in_pipeline) | - |
| Excellent | Health score ≥ 80 | Maksimalkan |
| Good | Health score 60-79 | Maintain |
| At Risk | Health score 40-59 | Perlu monitoring |
| Critical | Health score < 40 | Urgent intervention |
| Overdue | Melewati due date | Minimize |
| Avg Health Score | Rata-rata health score (0-100) | ≥ 70 |
| Avg Progress | Rata-rata progress (%) | - |

### 2.2 Health Score Calculation

Algorithm untuk menghitung health score (baseline: 100):

```
Health Score = 100
  - 30 (if overdue)
  - 20 (if high/critical risk)
  - 10 (if high/critical impact)
  - 15 (if due in < 7 days & progress < 80%)
  - 10 (if high complexity & progress < 30%)
  - 15 (if no developer assigned)
```

**Kategori:**
- 80-100: Excellent (🟢)
- 60-79: Good (🟡)
- 40-59: At Risk (🟠)
- 0-39: Critical (🔴)

### 2.3 Projects Health Table

Detail semua project dengan metrics:

| Column | Source | Keterangan |
|--------|--------|------------|
| Ticket Number | work_items.ticketNumber | - |
| Title | work_items.title | - |
| Status | work_items.status | Current stage |
| Priority | work_items.priority | - |
| Department | departments.name | - |
| Vendor | vendors.name | Platform |
| Progress % | Stage-based | 0-100% |
| Health Score | Calculated | 0-100 |
| Health Status | Derived | Excellent/Good/At Risk/Critical |
| Days Elapsed | Business days from created | - |
| Days Until Due | Days remaining to due date | - |
| Is Overdue | Boolean | - |
| Estimated Mandays | assessments.estimatedManDays | - |
| Complexity | assessments.complexity | Low/Medium/High |
| Risk | assessments.risk | Low/Medium/High/Critical |
| Impact | assessments.impact | Low/Medium/High/Critical |
| Total Tasks | Count from tasks table | - |
| Completed Tasks | tasks with status='done' | - |
| Task Progress % | (Completed / Total) × 100% | - |
| Team Members | Manager, BA, Dev, QA | - |
| Team Completeness % | (Assigned / 4) × 100% | - |

### 2.4 Health Trend Chart

6-month trend showing health distribution:

| Series | Deskripsi |
|--------|-----------|
| Excellent | Projects with score ≥ 80 |
| Good | Projects with score 60-79 |
| At Risk | Projects with score 40-59 |
| Critical | Projects with score < 40 |

### 2.5 Risk Matrix

Plot projects by Risk vs Impact:

| Risk Level | Impact Level | Action |
|------------|--------------|--------|
| High | High | Top priority mitigation |
| High | Medium | Monitor closely |
| Medium | High | Contingency plan |
| Low | Low | Standard monitoring |

### 2.6 Complexity Distribution

Breakdown by complexity level:

| Level | Typical Characteristics |
|-------|------------------------|
| Low | Simple changes, < 5 mandays |
| Medium | Moderate complexity, 5-20 mandays |
| High | Complex integration, > 20 mandays |

---

## 3. Mandays Report

**Path:** `/reports/mandays`

**Tujuan:** Resource planning, budget tracking, dan vendor capacity management.

### 3.1 Mandays Summary KPIs

| Metric | Rumus | Keterangan |
|--------|-------|------------|
| Total Planned | Sum of estimatedManDays | Dari assessment |
| Total Top-up | Sum of mandays_topups | Additional allocation |
| Total Allocated | Planned + Top-up | Total resource tersedia |
| Total Used | Sum of actual mandays | Yang sudah digunakan |
| Total Remaining | Allocated - Used | Sisa resource |
| Avg Utilization % | (Used / Allocated) × 100% | Tingkat penggunaan |

### 3.2 Vendor Mandays Balance

Per-vendor resource tracking:

| Column | Deskripsi |
|--------|-----------|
| Vendor Name | Platform name |
| Planned | Initial allocation dari assessment |
| Actual/Used | Mandays yang sudah terpakai |
| Top-up | Additional allocations |
| Total | Planned + Top-up |
| Remaining | Total - Used |
| Utilization % | Percentage used |

**Alert Thresholds:**
- 🟢 < 70%: Healthy
- 🟡 70-90%: Monitor
- 🔴 > 90%: Plan top-up
- ⚠️ Negative: Over budget

### 3.3 Mandays Trend Chart

Time-series showing resource consumption:

| Series | Keterangan |
|--------|------------|
| Planned | Estimated mandays per period |
| Actual | Used mandays per period |
| Top-up | Additional allocations |

**Granularity based on filter:**
- Year filter → 12 months (Jan-Dec)
- Quarter filter → 3 months in quarter
- Month filter → 4-5 weeks in month
- Custom → Per month in range

### 3.4 Project Mandays Detail

Per-project resource usage:

| Column | Keterangan |
|--------|------------|
| Ticket Number | CR ID |
| Title | CR title |
| Vendor | Platform |
| Department | - |
| Developer | Assigned dev |
| Planned | Estimated mandays |
| Actual | Used mandays |
| Variance | Actual - Planned |
| Utilization % | (Actual / Planned) × 100% |
| Status | Current stage |

**Variance Interpretation:**
- Positive variance: Over budget
- Negative variance: Under budget (efficient)
- 0: Sesuai estimasi

### 3.5 Top Over-Allocated Projects

Top 10 projects dengan actual > planned:

Sorted by variance (descending) untuk identify estimation issues.

### 3.6 Deviation Analysis

Distribution of estimation accuracy:

| Range | Count | Interpretation |
|-------|-------|----------------|
| Within ±10% | X projects | Excellent estimation |
| Within ±20% | X projects | Good estimation |
| Over ±20% | X projects | Poor estimation |

**Target:** >70% within ±20%

### 3.7 Mandays Top-up History

Log of all top-up transactions:

| Column | Keterangan |
|--------|-----------|
| Vendor | Platform name |
| Mandays | Amount added |
| Notes | Reason for top-up |
| Created By | User who created |
| Created At | Timestamp |

---

## 4. Dashboard Report

**Path:** `/dashboard` (Home)

**Tujuan:** Quick overview untuk daily monitoring.

### 4.1 Quick Stats

| Stat | Source | Keterangan |
|------|--------|------------|
| Total Requests | work_items count | All time |
| In Progress | Status = development, uat, deployment | Active work |
| Pending | Status = in_pipeline, assessment | Waiting |
| Completed This Month | Go live in current month | Monthly achievement |

### 4.2 My Tasks / My Requests

**For Staff (Admin/Manager/BA/Dev/QA):**
- Shows assigned work items
- Filter by assignee role

**For Business User:**
- Shows requests created by user email
- OR requests from same department
- Implements department-based access control

### 4.3 Status Distribution Chart

Mini version of status breakdown (like Executive Overview).

### 4.4 Priority Distribution

Quick view of priority levels across all requests.

### 4.5 Recent Activity

Last 10 activities in the system.

---

## 5. Filter Options

Semua reports mendukung filter berikut:

### 5.1 Period Filters

| Filter Type | Parameters | Behavior |
|-------------|-----------|----------|
| **Year** | year | Jan 1 - Dec 31 of selected year |
| **Quarter** | year, quarter | Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec |
| **Month** | year, month | First day - last day of month |
| **Custom Range** | startDate, endDate | Specific date range |

### 5.2 Dimension Filters

| Filter | Scope | Behavior |
|--------|-------|----------|
| **Department** | departmentId | Filter by requester department |
| **Platform/Vendor** | vendorId | Filter by platform (Oracle, SAP, etc) |

### 5.3 Filter Behavior

**Executive Overview & Mandays:**
- Combines ALL filters (AND logic)
- Period filter: created date within range
- Includes active projects + projects in period

**Project Health:**
- Shows active projects OR projects in period
- Excludes dropped projects
- Active = status not in (go_live, drop)

---

## 6. Business Days Calculation

**Metode:** Excludes weekends (Sabtu & Minggu) dan 15 Indonesian holidays 2026.

### 6.1 Indonesian Holidays 2026

| Date | Holiday |
|------|---------|
| Jan 1 | Tahun Baru Masehi |
| Jan 23 | Tahun Baru Imlek |
| Mar 22 | Isra Mikraj Nabi Muhammad SAW |
| Mar 31 | Hari Suci Nyepi (Tahun Baru Saka 1948) |
| Apr 10 | Wafat Isa Al-Masih |
| May 1 | Hari Buruh Internasional |
| May 15 | Kenaikan Isa Al-Masih |
| May 29 | Hari Raya Waisak 2570 |
| Jun 1 | Hari Lahir Pancasila |
| Jun 5 | Hari Raya Idul Adha 1447 H |
| Jun 26 | Tahun Baru Islam 1448 H |
| Aug 17 | Hari Kemerdekaan RI |
| Sep 4 | Maulid Nabi Muhammad SAW |
| Dec 25 | Hari Raya Natal |

### 6.2 Usage

Digunakan untuk menghitung:
1. **Avg Cycle Time** - Created → Go Live
2. **SLA Achievement** - Comparison dengan SLA target
3. **Cycle Time by Stage** - Duration per stage
4. **Projects Health** - Days elapsed & days until due

### 6.3 Formula Example

```typescript
// Exclude weekends
if (day is Saturday or Sunday) skip

// Exclude holidays
if (date in indonesianHolidays2026) skip

// Count only business days
businessDays++
```

---

## 7. Export Options

Semua reports mendukung 3 format export:

### 7.1 Excel (.xlsx)

**Includes:**
- Summary sheet with KPIs
- Detail sheet with all data
- Charts/graphs (if supported)

**Use Case:** Detailed analysis, sharing with stakeholders

### 7.2 CSV (.csv)

**Includes:**
- Raw data only
- Comma-separated values

**Use Case:** Import to other tools, database, further processing

### 7.3 PDF (.pdf)

**Includes:**
- Visual report with charts
- Summary metrics
- Formatted for printing

**Use Case:** Presentations, executive reports, archiving

### 7.4 Print

Browser print function for quick hardcopy.

---

## 8. Role-Based Access

### 8.1 Report Access Matrix

| Report | Admin | Manager | BA | Dev | QA | Vendor | Business User |
|--------|-------|---------|----|----|-----|--------|---------------|
| Executive Overview | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Project Health | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Mandays | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| All Requests | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Limited* |
| Kanban | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | View Only |

*Business User: Can only see own requests OR requests from same department

### 8.2 Data Visibility

**Business User Access Control:**
```sql
WHERE (
  requesterEmail = user.email 
  OR departmentId = user.departmentId
)
```

**Business Analyst Filter:**
- "My Projects" button in Kanban
- Shows only assigned projects (as BA or Manager)

---

## 9. API Endpoints Reference

### 9.1 Executive Overview

```http
GET /api/reports/executive-overview

Query Parameters:
?year=2026
?quarter=1
?month=7
?startDate=2026-01-01
?endDate=2026-12-31
?departmentId={uuid}
?vendorId={uuid}

Response:
{
  "success": true,
  "data": {
    "summary": { ... },
    "requestsByStatus": [ ... ],
    "requestsByPriority": [ ... ],
    "monthlyTrend": [ ... ],
    "projectProgress": [ ... ],
    "timelineProjects": [ ... ],
    "slaBreakdown": { ... },
    "workloadByAssignee": [ ... ],
    "avgCycleTimeByStage": [ ... ],
    "recentActivity": [ ... ],
    "projectsHealth": [ ... ],
    "mandaysPerVendor": [ ... ],
    "mandaysSummary": { ... }
  }
}
```

### 9.2 Project Health

```http
GET /api/reports/project-health

Query Parameters: Same as Executive Overview

Response:
{
  "success": true,
  "data": {
    "summary": { ... },
    "projects": [ ... ],
    "healthTrend": [ ... ],
    "riskMatrix": [ ... ],
    "complexityDistribution": { ... },
    "projectsByHealth": { ... }
  }
}
```

### 9.3 Mandays

```http
GET /api/reports/mandays

Query Parameters: Same as Executive Overview

Response:
{
  "success": true,
  "data": {
    "summary": { ... },
    "vendorMandays": [ ... ],
    "projectMandays": [ ... ],
    "mandaysTrend": [ ... ],
    "topups": [ ... ],
    "overAllocated": [ ... ],
    "deviationAnalysis": { ... }
  }
}
```

---

## 10. Troubleshooting

### 10.1 Data Tidak Muncul

**Check:**
1. Filter settings - pastikan periode yang dipilih benar
2. User role - apakah punya akses ke report ini?
3. Data availability - apakah ada data di periode tersebut?

### 10.2 Filter Tidak Berfungsi

**Solution:**
1. Refresh page (F5)
2. Clear browser cache
3. Check console for errors (F12)
4. Verify backend logs

### 10.3 Angka Tidak Akurat

**Verify:**
1. Business days calculation - exclude weekends & holidays
2. Date range - pastikan filter periode benar
3. Status filtering - pastikan include/exclude status sesuai
4. Timezone - pastikan consistent

### 10.4 Export Gagal

**Common Issues:**
1. Data terlalu besar - batasi period atau filter
2. Browser blocking popup - allow popup untuk export
3. Network timeout - coba lagi atau export range lebih kecil

---

## 11. Best Practices

### 11.1 Report Usage

1. **Daily:** Dashboard untuk quick monitoring
2. **Weekly:** Executive Overview untuk trend analysis
3. **Monthly:** 
   - Mandays Report untuk budget review
   - Project Health untuk risk assessment
4. **Quarterly:** Executive Overview untuk stakeholder presentation

### 11.2 Performance Tips

1. **Use specific filters** - batasi data dengan filter periode
2. **Avoid "All Time" queries** - gunakan year atau quarter filter
3. **Export selectively** - filter dulu sebelum export
4. **Refresh periodically** - data di-cache, klik refresh untuk data terbaru

### 11.3 Data Interpretation

1. **Compare trends** - bandingkan dengan periode sebelumnya
2. **Look for patterns** - identify recurring issues
3. **Drill down** - dari summary ke detail untuk root cause
4. **Cross-reference** - validate angka antar reports
5. **Context matters** - pertimbangkan external factors (holidays, etc)

---

## 12. Changelog

### Version 1.0 (Current)

**Features:**
- ✅ Business days calculation dengan Indonesian holidays 2026
- ✅ Department-based access control untuk business users
- ✅ BA filter di Kanban ("My Projects")
- ✅ React Query cache fix untuk filter responsiveness
- ✅ Responsive design untuk mobile/tablet
- ✅ Excel/CSV/PDF export
- ✅ Real-time activity logs

**Metrics:**
- ✅ SLA Achievement (business days)
- ✅ Avg Cycle Time (business days)
- ✅ Cycle Time by Stage (business days)
- ✅ Mandays tracking per vendor
- ✅ Project health score algorithm
- ✅ Resource utilization tracking

---

## 13. Support & Feedback

Untuk pertanyaan, issue, atau request fitur baru:

1. **Technical Issues:** Check DEPLOYMENT_GUIDE.md
2. **Access Issues:** Contact system administrator
3. **Data Questions:** Refer to this document
4. **Feature Requests:** Submit through proper channels

---

**Last Updated:** 2026-07-22  
**Document Version:** 1.0  
**System Version:** IT Workflow Management v1.0
