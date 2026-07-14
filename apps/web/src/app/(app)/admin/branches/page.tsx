import { Metadata } from 'next'
import { MasterDataView } from '@/features/admin/master-data-view'

export const metadata: Metadata = { title: 'Branches' }
export default function BranchesPage() {
  return <MasterDataView type="branches" title="Branches" />
}
