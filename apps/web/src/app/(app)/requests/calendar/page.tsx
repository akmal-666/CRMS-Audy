import { CalendarView } from '@/features/calendar/calendar-view'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Calendar | CRMS' }

export default function CalendarPage() {
  return (
    <div className="flex-1 overflow-hidden">
      <CalendarView />
    </div>
  )
}
