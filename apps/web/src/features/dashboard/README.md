# Dashboard - Data Sources & Calculations

## Overview
Dashboard ini menampilkan ringkasan portfolio IT Change Request dengan data real-time dari database.

---

## Data Source
Semua data diambil dari endpoint: `GET /api/dashboard/stats`

### Response Structure:
```typescript
{
  total: number                    // Total semua work items
  byStatus: Record<string, number> // Breakdown per status
  byPriority: Record<string, number> // Breakdown per priority
  overdue: number                  // Jumlah request yang overdue
  recentItems: Array<WorkItem>     // 10 work items terbaru
  monthlyTrend: Array<{month, count}> // Data 6 bulan terakhir
  businessAnalysts: Array<{id, name, count}> // BA workload
}
```

---

## Cards Calculation

### 1. **Total Projects**
**Display:** Total semua change requests (semua status)

**Source:**
```typescript
stats.total
```

**Query:**
```sql
SELECT COUNT(*) FROM work_items
```

**Trend Calculation:**
- Membandingkan jumlah request bulan ini vs bulan lalu
- Formula: `((currentMonth - lastMonth) / lastMonth) * 100`

---

### 2. **Active Tasks**
**Display:** Jumlah tasks yang sedang aktif dikerjakan

**Source:**
```typescript
stats.byStatus['development'] + 
stats.byStatus['uat'] + 
stats.byStatus['deployment']
```

**Query:**
```sql
SELECT COUNT(*) 
FROM work_items 
WHERE status IN ('development', 'uat', 'deployment')
```

**Definition:**
- Active task adalah CR yang sedang dalam proses pengerjaan
- Tidak termasuk: in_pipeline, assessment, go_live, drop

---

### 3. **Completed Milestones**
**Display:** Jumlah projects yang sudah live

**Source:**
```typescript
stats.byStatus['go_live']
```

**Query:**
```sql
SELECT COUNT(*) 
FROM work_items 
WHERE status = 'go_live'
```

**Definition:**
- Hanya menghitung CR yang sudah status `go_live`
- Ini adalah satu-satunya milestone yang dianggap "completed"

---

### 4. **Portfolio Progress**
**Display:** Persentase completion rate dari seluruh portfolio

**Source:**
```typescript
(stats.byStatus['go_live'] / stats.total) * 100
```

**Formula:**
```
Portfolio Progress = (Completed Projects / Total Projects) * 100%
```

**100% Achievement:**
- Progress mencapai 100% ketika **SEMUA** projects sudah status `go_live`
- Ini adalah target completion portfolio

**Example:**
- Total: 100 projects
- Go Live: 25 projects
- Progress: 25%

---

## Project Progress Bar (Ongoing Projects)

### Status-Based Progress Mapping
Progress bar untuk setiap project dihitung berdasarkan **status actual** di kanban:

| Status | Progress | Penjelasan |
|--------|----------|------------|
| `in_pipeline` | 0% | Masih di antrian, belum dimulai |
| `assessment` | 10% | Sedang analisis kebutuhan |
| `development` | 40% | Sedang development |
| `uat` | 70% | User Acceptance Testing |
| `deployment` | 90% | Proses deploy ke production |
| `go_live` | 100% | Sudah live di production |
| `drop` | 0% | Project dibatalkan |

### Why This Mapping?
1. **Realistic milestones**: Mencerminkan effort & waktu tiap fase
2. **Non-linear**: Development memakan waktu lebih banyak dibanding assessment
3. **Clear target**: 100% hanya tercapai saat go_live

### Implementation:
```typescript
const STATUS_PROGRESS: Record<string, number> = {
  'in_pipeline': 0,
  'assessment': 10,
  'development': 40,
  'uat': 70,
  'deployment': 90,
  'go_live': 100,
  'drop': 0,
}

// Usage
const progress = STATUS_PROGRESS[project.status] ?? 0
```

---

## Business Analysts Section

### Display
List semua Business Analysts beserta jumlah projects yang di-assign ke mereka

### Source:
```typescript
stats.businessAnalysts
// Array: [{ id: string, name: string, count: number }]
```

### Query:
```sql
SELECT 
  business_analyst_id,
  COUNT(*) as count
FROM work_items
WHERE business_analyst_id IS NOT NULL
  AND status NOT IN ('go_live', 'drop')
GROUP BY business_analyst_id
```

### Count Logic:
- Hanya menghitung project yang **aktif** (exclude go_live & drop)
- Hanya BA yang sudah di-assign ke minimal 1 project
- Sorted by count (descending)

---

## Upcoming Deadlines

### Display
3 CR terdekat yang akan deadline (berdasarkan `dueDate`)

### Filter Logic:
```typescript
stats.recentItems
  .filter(item => item.dueDate && new Date(item.dueDate) > new Date())
  .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
  .slice(0, 3)
```

### Rules:
- Hanya menampilkan CR yang punya `dueDate`
- Hanya future deadlines (belum lewat)
- Sorted ascending (deadline terdekat di atas)
- Max 3 items

---

## Ongoing Projects

### Display
3 projects yang sedang dalam pengerjaan aktif

### Filter Logic:
```typescript
stats.recentItems
  .filter(item => 
    ['assessment', 'development', 'uat', 'deployment'].includes(item.status)
  )
  .slice(0, 3)
```

### Rules:
- Status: assessment, development, uat, deployment
- Exclude: in_pipeline, go_live, drop
- Max 3 items
- Sorted by latest `createdAt`

---

## Monthly Trends

### Source:
```typescript
stats.monthlyTrend
// Array: [{ month: 'YYYY-MM', count: number }]
```

### Query:
```sql
SELECT 
  strftime('%Y-%m', datetime(created_at/1000, 'unixepoch')) as month,
  COUNT(*) as count
FROM work_items
WHERE created_at >= (current_timestamp - INTERVAL 6 MONTH)
GROUP BY month
```

### Trend Indicator:
```typescript
const currentMonthCount = monthlyTrend[monthlyTrend.length - 1].count
const lastMonthCount = monthlyTrend[monthlyTrend.length - 2].count
const trend = ((currentMonthCount - lastMonthCount) / lastMonthCount) * 100
```

- **Positive trend** (↑): Lebih banyak request dibanding bulan lalu
- **Negative trend** (↓): Lebih sedikit request dibanding bulan lalu

---

## Avatar Indicators (Project Cards)

Setiap project card menampilkan avatar dari team members yang assigned:

| Color | Role | Field |
|-------|------|-------|
| Blue | Manager | `manager` |
| Indigo | Business Analyst | `businessAnalyst` |
| Violet | Developer | `developer` |
| Emerald | QA | `qa` |

Avatar menampilkan initial dari nama (first character).

---

## Refresh Interval

Dashboard data di-refresh otomatis setiap **30 detik**:

```typescript
useQuery({
  queryKey: ['dashboard-stats'],
  queryFn: () => apiGet('/api/dashboard/stats'),
  refetchInterval: 30000, // 30 seconds
})
```

---

## Performance Notes

1. **Single API call**: Semua data di-fetch dalam 1 request untuk efisiensi
2. **Parallel queries**: Backend menggunakan `Promise.all()` untuk fetch data secara parallel
3. **Indexed queries**: Status, priority, department sudah di-index di database
4. **Limited results**: Recent items dibatasi 10 records untuk performance

---

## Future Enhancements

- [ ] Add filter by department
- [ ] Add filter by date range  
- [ ] Export dashboard to PDF/Excel
- [ ] Real-time updates via WebSocket
- [ ] Custom dashboard per user role
