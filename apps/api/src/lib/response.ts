import type { ApiResponse, Pagination } from '@crms/types'

export function ok<T>(data: T, message = 'Success', pagination?: Pagination): ApiResponse<T> {
  return { success: true, message, data, ...(pagination ? { pagination } : {}) }
}

export function err(message: string, errors?: { field?: string; message: string }[]): ApiResponse {
  return { success: false, message, ...(errors ? { errors } : {}) }
}

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): ApiResponse<T[]> {
  return {
    success: true,
    message: 'Success',
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}
