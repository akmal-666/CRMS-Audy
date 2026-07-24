import { Metadata } from 'next'
import { MigrationView } from '@/features/admin/migration-view'

export const metadata: Metadata = { title: 'CR Migration | CRMS' }

export default function MigrationPage() {
  return (
    <div className="max-w-5xl">
      <MigrationView />
    </div>
  )
}
