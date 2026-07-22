import type { MiddlewareHandler } from 'hono'
import type { Bindings, Variables } from '../types'
import { UserRole } from '@crms/types'
import { err } from '../lib/response'

export function requireRole(...roles: UserRole[]): MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> {
  return async (c, next) => {
    const user = c.get('user')
    if (!user) return c.json(err('Unauthorized'), 401)
    if (!roles.includes(user.role as UserRole)) {
      return c.json(err('Forbidden: insufficient permissions'), 403)
    }
    await next()
  }
}

export function requireAnyRole(...roles: UserRole[]): MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> {
  return requireRole(...roles)
}

export const ADMIN_ROLES = [UserRole.ADMINISTRATOR]
export const MANAGER_ROLES = [UserRole.ADMINISTRATOR, UserRole.MANAGER]
export const STAFF_ROLES = [
  UserRole.ADMINISTRATOR,
  UserRole.MANAGER,
  UserRole.BUSINESS_USER,
  UserRole.BUSINESS_ANALYST,
  UserRole.VENDOR,
]
