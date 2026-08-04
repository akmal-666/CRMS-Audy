import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'
import { workItems } from './work-items'
import { users } from './users'

/**
 * Tracks mandays negotiation process
 * Request -> Negotiate -> Approve flow
 */
export const mandaysNegotiations = sqliteTable('mandays_negotiations', {
  id: text('id').primaryKey(),
  workItemId: text('work_item_id').notNull().unique().references(() => workItems.id, { onDelete: 'cascade' }),
  
  // Three-stage tracking
  mandaysRequested: real('mandays_requested').notNull(), // Initial request (immutable)
  mandaysNegotiated: real('mandays_negotiated'),         // BA/PM proposal (optional)
  mandaysApproved: real('mandays_approved').notNull(),   // Final approved
  
  // Negotiation metadata
  negotiationStatus: text('negotiation_status', { 
    enum: ['none', 'proposed', 'accepted', 'rejected', 'pending'] 
  }).notNull().default('none'),
  negotiationNotes: text('negotiation_notes'),           // Why negotiated
  rejectionReason: text('rejection_reason'),             // If rejected
  
  // Tracking
  negotiatedBy: text('negotiated_by').references(() => users.id), // Who proposed
  negotiatedAt: integer('negotiated_at', { mode: 'timestamp' }),  // When proposed
  respondedBy: text('responded_by').references(() => users.id),   // Who accepted/rejected
  respondedAt: integer('responded_at', { mode: 'timestamp' }),    // When responded
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const mandaysNegotiationsRelations = relations(mandaysNegotiations, ({ one }) => ({
  workItem: one(workItems, { fields: [mandaysNegotiations.workItemId], references: [workItems.id] }),
  negotiator: one(users, { 
    fields: [mandaysNegotiations.negotiatedBy], 
    references: [users.id],
    relationName: 'negotiator'
  }),
  responder: one(users, { 
    fields: [mandaysNegotiations.respondedBy], 
    references: [users.id],
    relationName: 'responder'
  }),
}))
