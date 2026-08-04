/**
 * Business Days Calculator
 * Calculates working days excluding weekends (Saturday, Sunday) and Indonesian public holidays
 */

/**
 * Indonesian Public Holidays 2026
 * Source: Official government calendar
 */
const INDONESIAN_HOLIDAYS_2026 = [
  // January
  new Date(2026, 0, 1),   // New Year's Day
  
  // February
  new Date(2026, 1, 17),  // Isra Mi'raj (estimated)
  
  // March
  new Date(2026, 2, 11),  // Nyepi (estimated)
  new Date(2026, 2, 31),  // Ramadan begins (estimated)
  
  // April
  new Date(2026, 3, 1),   // Eid al-Fitr Day 1 (estimated)
  new Date(2026, 3, 2),   // Eid al-Fitr Day 2 (estimated)
  
  // May
  new Date(2026, 4, 1),   // Labour Day
  new Date(2026, 4, 14),  // Ascension Day
  new Date(2026, 4, 26),  // Vesak Day (estimated)
  
  // June
  new Date(2026, 5, 1),   // Pancasila Day
  new Date(2026, 5, 8),   // Eid al-Adha (estimated)
  new Date(2026, 5, 29),  // Islamic New Year (estimated)
  
  // August
  new Date(2026, 7, 17),  // Independence Day
  new Date(2026, 7, 28),  // Mawlid al-Nabi (estimated)
  
  // December
  new Date(2026, 11, 25), // Christmas Day
]

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // 0 = Sunday, 6 = Saturday
}

/**
 * Check if a date is a public holiday
 */
function isPublicHoliday(date: Date): boolean {
  return INDONESIAN_HOLIDAYS_2026.some(holiday => 
    holiday.getFullYear() === date.getFullYear() &&
    holiday.getMonth() === date.getMonth() &&
    holiday.getDate() === date.getDate()
  )
}

/**
 * Check if a date is a business day (not weekend, not public holiday)
 */
export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isPublicHoliday(date)
}

/**
 * Calculate business days between two dates
 * Excludes weekends and Indonesian public holidays
 * 
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of business days (excluding weekends and holidays)
 */
export function calculateBusinessDays(startDate: Date, endDate: Date): number {
  if (startDate > endDate) {
    return 0 // Invalid range
  }

  let businessDays = 0
  const current = new Date(startDate)
  
  // Normalize to start of day for comparison
  current.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)

  while (current <= end) {
    if (isBusinessDay(current)) {
      businessDays++
    }
    current.setDate(current.getDate() + 1)
  }

  return businessDays
}

/**
 * Add business days to a date
 * Skips weekends and public holidays
 * 
 * @param startDate - Start date
 * @param daysToAdd - Number of business days to add
 * @returns New date after adding business days
 */
export function addBusinessDays(startDate: Date, daysToAdd: number): Date {
  const result = new Date(startDate)
  let daysAdded = 0

  while (daysAdded < daysToAdd) {
    result.setDate(result.getDate() + 1)
    if (isBusinessDay(result)) {
      daysAdded++
    }
  }

  return result
}

/**
 * Get all public holidays for display
 */
export function getPublicHolidays(): Date[] {
  return [...INDONESIAN_HOLIDAYS_2026]
}
