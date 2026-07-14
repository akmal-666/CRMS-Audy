import { Metadata } from 'next'
import { MasterDataView } from '@/features/admin/master-data-view'

export const metadata: Metadata = { title: 'Departments' }
export default function DepartmentsPage() {
  return <MasterDataView type="departments" title="Departments" />
}
