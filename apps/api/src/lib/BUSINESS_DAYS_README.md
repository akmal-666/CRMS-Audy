# Business Days Calculator

## Overview
Utility untuk menghitung hari kerja (working days) dengan mengecualikan:
- **Sabtu & Minggu** (weekend)
- **Tanggal merah Indonesia** (public holidays)

## Features

### 1. Calculate Business Days
Menghitung jumlah hari kerja antara dua tanggal.

```typescript
import { calculateBusinessDays } from './business-days'

const start = new Date(2026, 0, 1)  // 1 Jan 2026 (Thursday)
const end = new Date(2026, 0, 10)   // 10 Jan 2026 (Saturday)

const days = calculateBusinessDays(start, end)
// Returns: 7 business days (excludes 2 Saturdays, 2 Sundays)
```

### 2. Add Business Days
Menambahkan sejumlah hari kerja ke tanggal tertentu.

```typescript
import { addBusinessDays } from './business-days'

const start = new Date(2026, 0, 5)  // Monday
const result = addBusinessDays(start, 5)
// Returns: Next Monday (skips weekend)
```

### 3. Check Business Day
Cek apakah tanggal tertentu adalah hari kerja.

```typescript
import { isBusinessDay } from './business-days'

const saturday = new Date(2026, 0, 3)
const monday = new Date(2026, 0, 5)

isBusinessDay(saturday)  // false (weekend)
isBusinessDay(monday)    // true (business day)
```

## Indonesian Public Holidays 2026

| Date | Holiday |
|------|---------|
| 1 Jan | New Year's Day |
| 17 Feb | Isra Mi'raj |
| 11 Mar | Nyepi |
| 31 Mar | Ramadan begins |
| 1-2 Apr | Eid al-Fitr |
| 1 May | Labour Day |
| 14 May | Ascension Day |
| 26 May | Vesak Day |
| 1 Jun | Pancasila Day |
| 8 Jun | Eid al-Adha |
| 29 Jun | Islamic New Year |
| 17 Aug | Independence Day |
| 28 Aug | Mawlid al-Nabi |
| 25 Dec | Christmas Day |

**Note:** Tanggal untuk hari raya Islam bersifat estimasi (mengikuti kalender Hijriah).

## Usage in Reports

### Executive Overview Report
```typescript
// OLD: Calendar days (incorrect)
const days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24))

// NEW: Business days only (correct)
const businessDays = calculateBusinessDays(startDate, endDate)
```

### Avg Cycle Time Calculation
```typescript
const avgCycleTime = completedItems.reduce((acc, item) => {
  const businessDays = calculateBusinessDays(
    new Date(item.createdAt),
    new Date(item.goLiveDate)
  )
  return acc + businessDays
}, 0) / completedItems.length
```

### SLA Achievement
```typescript
const cycleTime = calculateBusinessDays(created, completed)
const slaTarget = priority === 'critical' ? 15 : priority === 'high' ? 30 : 60

// SLA in business days
const withinSLA = cycleTime <= slaTarget
```

## Benefits

### Before (Calendar Days)
- ❌ Includes weekends in calculation
- ❌ Includes public holidays
- ❌ Inflated cycle time numbers
- ❌ Inaccurate SLA tracking

**Example:**
- Project created: Monday 5 Jan
- Project completed: Monday 12 Jan
- Calendar days: **7 days** ❌ (includes 1 weekend)

### After (Business Days)
- ✅ Excludes Saturdays & Sundays
- ✅ Excludes Indonesian public holidays
- ✅ Accurate working days count
- ✅ Fair SLA measurement

**Example:**
- Project created: Monday 5 Jan
- Project completed: Monday 12 Jan
- Business days: **5 days** ✅ (excludes weekend)

## Updating Holidays

To add holidays for future years:

```typescript
// Add to INDONESIAN_HOLIDAYS_2026 array
const INDONESIAN_HOLIDAYS_2027 = [
  new Date(2027, 0, 1),   // New Year's Day
  // ... add more holidays
]
```

## Testing

```typescript
// Test weekend exclusion
const monday = new Date(2026, 0, 5)
const friday = new Date(2026, 0, 9)
const businessDays = calculateBusinessDays(monday, friday)
// Expected: 5 days (Mon, Tue, Wed, Thu, Fri)

// Test holiday exclusion
const beforeHoliday = new Date(2026, 0, 1)  // New Year
const afterHoliday = new Date(2026, 0, 2)
const days = calculateBusinessDays(beforeHoliday, afterHoliday)
// Expected: 0 days (both are holidays/weekends)
```

## Performance

- **Time Complexity:** O(n) where n is the number of days between dates
- **Space Complexity:** O(1) constant space
- **Optimized for:** Date ranges up to 1 year

For very large date ranges (>1 year), consider chunking or caching.

## Future Enhancements

- [ ] Add holidays for multiple years (2027, 2028, etc.)
- [ ] Support custom holiday lists per region
- [ ] Add half-day holiday support
- [ ] Cache frequently calculated ranges
- [ ] Add business hours calculation (not just days)

---

**Last Updated:** January 2026  
**Status:** ✅ Production Ready
