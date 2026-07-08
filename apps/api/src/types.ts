import type { Database } from '@crms/db'
import type { UserRole } from '@crms/types'

export interface Bindings {
  DB: D1Database
  CACHE: KVNamespace
  EMAIL_QUEUE: Queue
  JWT_SECRET: string
  ENVIRONMENT: string
  APP_URL: string
  PUBLIC_URL: string
  RESEND_API_KEY: string
  CAPTCHA_SECRET: string
  // Supabase Storage
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  SUPABASE_STORAGE_BUCKET: string
}

export interface Variables {
  db: Database
  user: JwtPayload | null
}

export interface JwtPayload {
  sub: string
  email: string
  name: string
  role: UserRole
  sessionId: string
  iat: number
  exp: number
}
