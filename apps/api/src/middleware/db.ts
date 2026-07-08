import type { MiddlewareHandler } from 'hono'
import type { Bindings, Variables } from '../types'
import { createDb } from '@crms/db'

export const dbMiddleware: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  const db = createDb(c.env.DB)
  c.set('db', db)
  await next()
}
