import { apiPost, apiGet } from './api'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  avatarUrl?: string
  department?: { id: string; name: string }
  branch?: { id: string; name: string }
}

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const res = await apiPost<{ token: string; user: AuthUser }>('/api/auth/login', { email, password })
  if (!res.success || !res.data) throw new Error(res.message)
  localStorage.setItem('crms_token', res.data.token)
  return res.data
}

export async function logout(): Promise<void> {
  await apiPost('/api/auth/logout')
  localStorage.removeItem('crms_token')
}

export async function getMe(): Promise<AuthUser | null> {
  try {
    const res = await apiGet<AuthUser>('/api/auth/me')
    return res.data || null
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('crms_token')
}
