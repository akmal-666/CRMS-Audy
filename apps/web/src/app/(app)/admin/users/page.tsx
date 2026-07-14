import { Metadata } from 'next'
import { UsersAdminView } from '@/features/admin/users-admin-view'

export const metadata: Metadata = { title: 'User Management' }

export default function UsersPage() {
  return <UsersAdminView />
}
