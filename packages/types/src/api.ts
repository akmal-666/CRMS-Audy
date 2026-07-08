export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  pagination?: Pagination
  errors?: ApiError[]
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface ApiError {
  field?: string
  message: string
  code?: string
}

export interface PaginatedRequest {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}
