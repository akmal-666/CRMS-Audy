import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'
import { vendors } from './departments'
import { users } from './users'

export const mandaysTopups = sqliteTable('mandays_topups', {
  id: text('id').primaryKey(),
  vendorId: text('vendor_id').notNull().references(() => vendors.id),
  mandays: real('mandays').notNull(),
  notes: text('notes'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  vendorIdx: index('mandays_topups_vendor_idx').on(table.vendorId),
  createdAtIdx: index('mandays_topups_created_at_idx').on(table.createdAt),
}))

export const mandaysTopupsRelations = relations(mandaysTopups, ({ one }) => ({
  vendor: one(vendors, { fields: [mandaysTopups.vendorId], references: [vendors.id] }),
  createdByUser: one(users, { fields: [mandaysTopups.createdBy], references: [users.id] }),
}))
