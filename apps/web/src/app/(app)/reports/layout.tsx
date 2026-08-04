import { ReportsGuard } from '@/features/reports/reports-guard'

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <ReportsGuard>{children}</ReportsGuard>
}
