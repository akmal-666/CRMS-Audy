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
  // Backblaze B2 Storage
  B2_ENDPOINT: string
  B2_ACCESS_KEY_ID: string
  B2_SECRET_ACCESS_KEY: string
  B2_BUCKET_NAME: string
  B2_REGION: string
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
