import axios from 'axios'
import type { ApiResponse } from '@crms/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor: attach token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('crms_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: handle 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('crms_token')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
  const res = await api.get<ApiResponse<T>>(url, { params })
  return res.data
}

export async function apiPost<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
  const res = await api.post<ApiResponse<T>>(url, data)
  return res.data
}

export async function apiPut<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
  const res = await api.put<ApiResponse<T>>(url, data)
  return res.data
}

export async function apiPatch<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
  const res = await api.patch<ApiResponse<T>>(url, data)
  return res.data
}

export async function apiDelete<T>(url: string): Promise<ApiResponse<T>> {
  const res = await api.delete<ApiResponse<T>>(url)
  return res.data
}
