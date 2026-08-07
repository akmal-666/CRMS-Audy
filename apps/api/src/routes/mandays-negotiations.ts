import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import type { Bindings, Variables } from '../types'
import { schema } from '@crms/db'
import { ok, err } from '../lib/response'
import { generateId } from '../lib/id'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { UserRole } from '@crms/types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Get negotiation details for a work item
app.get('/:workItemId', authMiddleware, async (c) => {
  const { workItemId } = c.req.param()
  const db = c.get('db')

  const negotiation = await db.query.mandaysNegotiations.findFirst({
    where: eq(schema.mandaysNegotiations.workItemId, workItemId),
    with: {
      negotiator: { columns: { id: true, name: true, email: true } },
      responder: { columns: { id: true, name: true, email: true } },
    },
  })

  if (!negotiation) {
    return c.json(ok(null))
  }

  return c.json(ok(negotiation))
})

// Create or update negotiation record
const createNegotiationSchema = z.object({
  mandaysRequested: z.number().positive('Requested mandays must be positive'),
  mandaysApproved: z.number().positive('Approved mandays must be positive'),
  mandaysNegotiated: z.number().positive().optional(),
  negotiationNotes: z.string().optional(),
})

app.post(
  '/:workItemId',
  authMiddleware,
  requireRole(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.BUSINESS_ANALYST),
  zValidator('json', createNegotiationSchema),
  async (c) => {
    const { workItemId } = c.req.param()
    const data = c.req.valid('json')
    const db = c.get('db')
    const user = c.get('user')!

    // Check if work item exists
    const workItem = await db.query.workItems.findFirst({
      where: eq(schema.workItems.id, workItemId),
    })

    if (!workItem) return c.json(err('Work item not found'), 404)

    // Check if negotiation already exists
    const existing = await db.query.mandaysNegotiations.findFirst({
      where: eq(schema.mandaysNegotiations.workItemId, workItemId),
    })

    if (existing) {
      return c.json(err('Negotiation record already exists. Use PATCH to update.'), 400)
    }

    // Always auto-accept: mandaysApproved = mandaysNegotiated (or mandaysRequested if no nego)
    const finalApproved = data.mandaysNegotiated ?? data.mandaysApproved

    // Create negotiation record
    const id = generateId()
    await db.insert(schema.mandaysNegotiations).values({
      id,
      workItemId,
      mandaysRequested: data.mandaysRequested,
      mandaysNegotiated: data.mandaysNegotiated ?? null,
      mandaysApproved: finalApproved,
      negotiationStatus: data.mandaysNegotiated ? 'accepted' : 'none',
      negotiationNotes: data.negotiationNotes ?? null,
      rejectionReason: null,
      negotiatedBy: data.mandaysNegotiated ? user.sub : null,
      negotiatedAt: data.mandaysNegotiated ? new Date() : null,
      respondedBy: data.mandaysNegotiated ? user.sub : null,
      respondedAt: data.mandaysNegotiated ? new Date() : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Update work item mandays to final approved value
    await db
      .update(schema.workItems)
      .set({ mandays: finalApproved, updatedAt: new Date() })
      .where(eq(schema.workItems.id, workItemId))

    // Activity log
    const savedMandays = data.mandaysRequested - data.mandaysApproved
    const description = savedMandays > 0
      ? `Mandays negotiated: ${data.mandaysRequested} → ${data.mandaysApproved} (saved ${savedMandays} days)`
      : `Mandays set: ${data.mandaysApproved} days`

    await db.insert(schema.activityLogs).values({
      id: generateId(),
      workItemId,
      userId: user.sub,
      action: 'mandays_negotiated',
      description,
      createdAt: new Date(),
    })

    return c.json(ok({ id }, 'Negotiation record created'), 201)
  }
)

// Propose negotiation — auto-accepts immediately (no separate approval needed)
const proposeNegotiationSchema = z.object({
  mandaysNegotiated: z.number().positive('Negotiated mandays must be positive'),
  negotiationNotes: z.string().optional(),
})

app.patch(
  '/:workItemId/propose',
  authMiddleware,
  requireRole(UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.BUSINESS_ANALYST),
  zValidator('json', proposeNegotiationSchema),
  async (c) => {
    const { workItemId } = c.req.param()
    const data = c.req.valid('json')
    const db = c.get('db')
    const user = c.get('user')!

    const negotiation = await db.query.mandaysNegotiations.findFirst({
      where: eq(schema.mandaysNegotiations.workItemId, workItemId),
    })

    if (!negotiation) {
      return c.json(err('Negotiation record not found. Create one first.'), 404)
    }

    // Auto-accept: set mandaysApproved = mandaysNegotiated immediately
    await db
      .update(schema.mandaysNegotiations)
      .set({
        mandaysNegotiated: data.mandaysNegotiated,
        mandaysApproved: data.mandaysNegotiated, // ← auto-accept
        negotiationNotes: data.negotiationNotes || null,
        negotiationStatus: 'accepted',           // ← auto-accept
        negotiatedBy: user.sub,
        negotiatedAt: new Date(),
        respondedBy: user.sub,
        respondedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.mandaysNegotiations.id, negotiation.id))

    // Update work item mandays to the negotiated value
    await db
      .update(schema.workItems)
      .set({ mandays: data.mandaysNegotiated, updatedAt: new Date() })
      .where(eq(schema.workItems.id, workItemId))

    // Activity log
    const reduction = negotiation.mandaysRequested - data.mandaysNegotiated
    await db.insert(schema.activityLogs).values({
      id: generateId(),
      workItemId,
      userId: user.sub,
      action: 'mandays_accepted',
      description: `Mandays negotiated: ${negotiation.mandaysRequested} → ${data.mandaysNegotiated} days (${reduction > 0 ? `saved ${reduction}` : `increased by ${Math.abs(reduction)}`} days)`,
      createdAt: new Date(),
    })

    return c.json(ok(null, 'Mandays negotiation saved'))
  }
)

// Accept or reject negotiation proposal
const respondNegotiationSchema = z.object({
  action: z.enum(['accept', 'reject']),
  rejectionReason: z.string().optional(),
})

app.patch(
  '/:workItemId/respond',
  authMiddleware,
  zValidator('json', respondNegotiationSchema),
  async (c) => {
    const { workItemId } = c.req.param()
    const { action, rejectionReason } = c.req.valid('json')
    const db = c.get('db')
    const user = c.get('user')!

    const negotiation = await db.query.mandaysNegotiations.findFirst({
      where: eq(schema.mandaysNegotiations.workItemId, workItemId),
    })

    if (!negotiation) {
      return c.json(err('Negotiation record not found'), 404)
    }

    if (negotiation.negotiationStatus !== 'proposed') {
      return c.json(err('No active proposal to respond to'), 400)
    }

    if (action === 'accept') {
      // Accept proposal
      await db
        .update(schema.mandaysNegotiations)
        .set({
          mandaysApproved: negotiation.mandaysNegotiated!,
          negotiationStatus: 'accepted',
          respondedBy: user.sub,
          respondedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.mandaysNegotiations.id, negotiation.id))

      // Update work item mandays
      await db
        .update(schema.workItems)
        .set({ mandays: negotiation.mandaysNegotiated!, updatedAt: new Date() })
        .where(eq(schema.workItems.id, workItemId))

      // Activity log
      const saved = negotiation.mandaysRequested - negotiation.mandaysNegotiated!
      await db.insert(schema.activityLogs).values({
        id: generateId(),
        workItemId,
        userId: user.sub,
        action: 'mandays_accepted',
        description: `Accepted negotiation: ${negotiation.mandaysNegotiated} days (saved ${saved} days)`,
        createdAt: new Date(),
      })

      return c.json(ok(null, 'Negotiation proposal accepted'))
    } else {
      // Reject proposal
      if (!rejectionReason) {
        return c.json(err('Rejection reason required'), 400)
      }

      await db
        .update(schema.mandaysNegotiations)
        .set({
          negotiationStatus: 'rejected',
          rejectionReason,
          respondedBy: user.sub,
          respondedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.mandaysNegotiations.id, negotiation.id))

      // Activity log
      await db.insert(schema.activityLogs).values({
        id: generateId(),
        workItemId,
        userId: user.sub,
        action: 'mandays_rejected',
        description: `Rejected negotiation proposal: ${rejectionReason}`,
        createdAt: new Date(),
      })

      return c.json(ok(null, 'Negotiation proposal rejected'))
    }
  }
)

// Get negotiation statistics (for reports)
app.get('/stats/summary', authMiddleware, async (c) => {
  const db = c.get('db')

  // Get all negotiations
  const negotiations = await db.query.mandaysNegotiations.findMany({
    with: {
      workItem: {
        with: {
          department: true,
        },
      },
      negotiator: { columns: { id: true, name: true } },
    },
  })

  // Calculate statistics
  const totalRequested = negotiations.reduce((sum, n) => sum + n.mandaysRequested, 0)
  const totalApproved = negotiations.reduce((sum, n) => sum + n.mandaysApproved, 0)
  const totalSaved = totalRequested - totalApproved
  const totalProjects = negotiations.length

  const negotiatedProjects = negotiations.filter(
    (n) => n.negotiationStatus === 'accepted' || n.negotiationStatus === 'proposed'
  ).length

  const acceptedNegotiations = negotiations.filter((n) => n.negotiationStatus === 'accepted')
  const rejectedNegotiations = negotiations.filter((n) => n.negotiationStatus === 'rejected')
  const pendingNegotiations = negotiations.filter((n) => n.negotiationStatus === 'proposed')

  // Top negotiators
  const negotiatorStats = new Map<string, { name: string; saved: number; count: number }>()
  acceptedNegotiations.forEach((n) => {
    if (n.negotiator) {
      const saved = n.mandaysRequested - n.mandaysApproved
      const existing = negotiatorStats.get(n.negotiator.id) || {
        name: n.negotiator.name,
        saved: 0,
        count: 0,
      }
      existing.saved += saved
      existing.count += 1
      negotiatorStats.set(n.negotiator.id, existing)
    }
  })

  const topNegotiators = Array.from(negotiatorStats.entries())
    .map(([id, stats]) => ({ id, ...stats }))
    .sort((a, b) => b.saved - a.saved)
    .slice(0, 10)

  // Department statistics
  const deptStats = new Map<string, { name: string; saved: number; requested: number; count: number }>()
  acceptedNegotiations.forEach((n) => {
    if (n.workItem?.department) {
      const deptId = n.workItem.department.id
      const saved = n.mandaysRequested - n.mandaysApproved
      const existing = deptStats.get(deptId) || {
        name: n.workItem.department.name,
        saved: 0,
        requested: 0,
        count: 0,
      }
      existing.saved += saved
      existing.requested += n.mandaysRequested
      existing.count += 1
      deptStats.set(deptId, existing)
    }
  })

  const departmentStats = Array.from(deptStats.entries())
    .map(([id, stats]) => ({
      departmentId: id,
      departmentName: stats.name,
      totalRequested: stats.requested,
      totalSaved: stats.saved,
      averageReduction: stats.requested > 0 ? (stats.saved / stats.requested) * 100 : 0,
      projectCount: stats.count,
    }))
    .sort((a, b) => b.averageReduction - a.averageReduction)

  return c.json(
    ok({
      summary: {
        totalRequested,
        totalApproved,
        totalSaved,
        savingsPercentage: totalRequested > 0 ? (totalSaved / totalRequested) * 100 : 0,
        totalProjects,
        negotiatedProjects,
        negotiationRate: totalProjects > 0 ? (negotiatedProjects / totalProjects) * 100 : 0,
      },
      statusBreakdown: {
        accepted: acceptedNegotiations.length,
        rejected: rejectedNegotiations.length,
        pending: pendingNegotiations.length,
      },
      topNegotiators,
      departmentStats,
      recentNegotiations: acceptedNegotiations.slice(0, 20).map((n) => ({
        workItemId: n.workItemId,
        ticketNumber: n.workItem?.ticketNumber,
        title: n.workItem?.title,
        mandaysRequested: n.mandaysRequested,
        mandaysNegotiated: n.mandaysNegotiated,
        mandaysApproved: n.mandaysApproved,
        saved: n.mandaysRequested - n.mandaysApproved,
        savingsPercentage:
          n.mandaysRequested > 0 ? ((n.mandaysRequested - n.mandaysApproved) / n.mandaysRequested) * 100 : 0,
        negotiatedBy: n.negotiator?.name,
        negotiatedAt: n.negotiatedAt,
      })),
    })
  )
})

export default app
