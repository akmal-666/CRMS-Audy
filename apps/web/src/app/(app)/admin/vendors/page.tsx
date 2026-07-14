import { Metadata } from 'next'
import { MasterDataView } from '@/features/admin/master-data-view'

export const metadata: Metadata = { title: 'Vendors' }
export default function VendorsPage() {
  return <MasterDataView type="vendors" title="Vendors" />
}
