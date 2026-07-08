import type { MiddlewareHandler } from 'hono'
import type { Bindings, Variables } from '../types'
import { verifyJwt } from '../lib/jwt'
import { err } from '../lib/response'

export const authMiddleware: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  const cookieToken = getCookieToken(c.req.raw)

  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken

  if (!token) {
    return c.json(err('Unauthorized'), 401)
  }

  const payload = await verifyJwt(token, c.env.JWT_SECRET)
  if (!payload) {
    return c.json(err('Invalid or expired token'), 401)
  }

  c.set('user', payload)
  await next()
}

export const optionalAuthMiddleware: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  const cookieToken = getCookieToken(c.req.raw)
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken

  if (token) {
    const payload = await verifyJwt(token, c.env.JWT_SECRET)
    if (payload) c.set('user', payload)
  }

  await next()
}

function getCookieToken(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie')
  if (!cookieHeader) return null
  const match = cookieHeader.match(/crms_token=([^;]+)/)
  return match ? match[1] : null
}
