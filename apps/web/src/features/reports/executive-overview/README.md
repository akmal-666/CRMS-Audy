# Executive Overview Report

## Overview
Comprehensive executive dashboard providing high-level insights into project portfolio performance, delivery metrics, and resource utilization.

## Features

### 📊 Key Performance Indicators (KPIs)
- **Total Requests** - Total number of change requests
- **Active Projects** - Currently in-progress projects
- **Completed** - Successfully delivered projects
- **Delayed** - Projects behind schedule
- **Avg Cycle Time** - Average time from assessment to go-live
- **SLA Achievement** - Percentage of projects meeting SLA targets

### 💰 Mandays & Vendor KPIs
- Real-time mandays utilization per vendor/platform
- Visual progress bars with color-coded alerts
- Remaining mandays tracking
- Top-up visibility
- Multi-CR aggregation per vendor

### 📈 Charts & Analytics

#### Requests by Status (Pie Chart)
- Visual breakdown by project stage
- Percentage distribution
- Interactive tooltips

#### Created vs Completed Trend (Line Chart)
- Monthly/Quarterly/Yearly trends
- Comparison of intake vs delivery rate
- Helps identify bottlenecks

#### Project Progress List
- Top 5 active projects
- Progress bars with stage indicators
- Quick access to project details

#### Timeline / Roadmap Overview
- Upcoming milestones
- Project timelines with risk indicators
- Visual roadmap for planning

#### Requests by Priority
- Critical/High/Medium/Low breakdown
- Helps prioritize resource allocation

#### SLA Achievement
- On-time vs Overdue projects
- Percentage achievement rate
- Detailed breakdown

#### Workload by Assignee
- Top 5 team members by workload
- Assigned/Completed/Remaining counts
- Utilization percentage with visual indicators

#### Average Cycle Time by Stage
- Time spent in each stage
- Identify process improvements
- Benchmark against standards

#### Recent Activity Feed
- Latest project updates
- Status changes, comments, assignments
- Real-time collaboration visibility

#### Projects Health Summary Table
- Comprehensive project health dashboard
- Progress tracking
- Risk indicators
- Issue counts (open/in-progress/done)
- SLA status

## Technical Implementation

### Architecture
- **Client-side rendering** with React Query for data fetching
- **Dynamic imports** for all Recharts components to avoid SSR issues
- **Optimistic UI** with loading states and skeletons
- **Responsive design** with Tailwind CSS

### SSR Compatibility (Cloudflare Pages Edge)
All chart components use proper SSR handling:

```typescript
// ✅ Correct pattern used throughout
const PieChart = dynamic(() => import('recharts').then(m => ({ default: m.PieChart })), { ssr: false })
const Pie = dynamic(() => import('recharts').then(m => ({ default: m.Pie })), { ssr: false })
```

**Key fixes applied:**
- ✅ All Recharts components dynamically imported with `ssr: false`
- ✅ `useMemo` for data transformations to prevent unnecessary re-renders
- ✅ Mounted state check to avoid hydration mismatches
- ✅ Lazy-loaded export utilities to prevent browser API calls on server
- ✅ Separated layout (server) from guard logic (client)

### Data Flow
1. User applies filters (year/quarter/month/custom date range)
2. Query params constructed via `useMemo`
3. React Query fetches data from `/api/reports/executive-overview`
4. Components render with loading states
5. Data displayed in charts and tables
6. Export functions available for Excel/CSV/PDF

### Export Functionality
- **Excel/CSV**: Raw data export for further analysis
- **PDF**: Formatted print-ready report
- All export functions lazy-loaded to avoid SSR issues

## API Endpoint
`GET /api/reports/executive-overview`

### Query Parameters
- `year` - Filter by year (e.g., 2026)
- `quarter` - Filter by quarter (1-4)
- `month` - Filter by month (1-12)
- `startDate` - Custom start date (YYYY-MM-DD)
- `endDate` - Custom end date (YYYY-MM-DD)
- `departmentId` - Filter by department
- `vendorId` - Filter by vendor

### Response Structure
```typescript
{
  summary: {
    totalRequests: number
    activeProjects: number
    completed: number
    delayed: number
    avgCycleTimeDays: number
    slaAchievement: number
  },
  mandaysPerVendor: Array<{
    vendorId: string
    vendorName: string
    used: number
    total: number
    remaining: number
    utilizationPercent: number
    projectCount: number
  }>,
  requestsByStatus: Array<{ status: string, count: number, percentage: number }>,
  monthlyTrend: Array<{ month: string, created: number, completed: number }>,
  projectProgress: Array<{ name: string, ticketNumber: string, progress: number, status: string }>,
  // ... more data structures
}
```

## Performance Optimizations
- React Query caching with smart invalidation
- Component memoization with `useMemo`
- Virtualized lists for large datasets (via overflow-auto)
- Lazy loading for export utilities
- Debounced filter changes

## Access Control
Protected by `ReportsGuard` component - only accessible to:
- **Administrator**
- **Manager**
- **Business Analyst**

Unauthorized users redirected to dashboard.

## Known Issues & Resolutions

### ❌ React Error #300 (RESOLVED)
**Issue**: "Minified React error #300" on Cloudflare Pages deployment

**Root Causes:**
1. Recharts components causing SSR hydration mismatches
2. Browser APIs (`window`, `document`) called during SSR
3. Layout file using `'use client'` directive incompatible with edge runtime

**Solutions Applied:**
- All chart components rebuilt with proper dynamic imports
- Export utilities lazy-loaded with `typeof window` guards
- Layout/Guard separation (server component imports client component)
- Mounted state check before rendering client-only content

**Status**: ✅ **FIXED** - Deployed successfully on Cloudflare Pages

## Future Enhancements
- [ ] Add drill-down capability to charts
- [ ] Real-time updates via WebSocket
- [ ] Custom report builder
- [ ] Scheduled email reports
- [ ] Comparison with previous periods
- [ ] Predictive analytics for forecasting
- [ ] Export templates customization

## Dependencies
- `recharts` - Chart library
- `@tanstack/react-query` - Data fetching
- `framer-motion` - Animations
- `lucide-react` - Icons
- `next` - Framework with dynamic imports

## Files Structure
```
executive-overview/
├── executive-overview-page.tsx      # Main container
├── overview-kpi-cards.tsx           # KPI summary cards
├── status-chart.tsx                 # Pie chart for status
├── trend-chart.tsx                  # Line chart for trends
├── priority-chart.tsx               # Pie chart for priority
├── sla-chart.tsx                    # SLA achievement chart
├── workload-chart.tsx               # Assignee workload
├── cycle-time-chart.tsx             # Bar chart for cycle time
├── project-progress-list.tsx        # Progress list
├── timeline-roadmap.tsx             # Timeline view
├── recent-activity.tsx              # Activity feed
├── project-health-table.tsx         # Health summary table
├── mandays-vendor-kpi.tsx           # Mandays tracking
└── README.md                        # This file
```

## Usage Example
```tsx
import { ExecutiveOverviewPage } from '@/features/reports/executive-overview'

export default function ExecutiveOverviewRoute() {
  return <ExecutiveOverviewPage />
}
```

---

**Last Updated**: January 2026  
**Status**: ✅ Production Ready  
**Deployment**: Cloudflare Pages Compatible
