import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'
import { workItems } from './work-items'
import { users } from './users'

/**
 * Junction table for multiple Business Analysts per work item.
 * Allows a CR to have more than one assigned BA.
 * Legacy field `businessAnalystId` in work_items is kept for backward compatibility.
 */
export const workItemBusinessAnalysts = sqliteTable('work_item_business_analysts', {
  id: text('id').primaryKey(),
  workItemId: text('work_item_id').notNull().references(() => workItems.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  addedBy: text('added_by').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  workItemIdx: index('wiba_work_item_idx').on(table.workItemId),
  userIdx: index('wiba_user_idx').on(table.userId),
  uniqueIdx: index('wiba_unique_idx').on(table.workItemId, table.userId),
}))

export const workItemBusinessAnalystsRelations = relations(workItemBusinessAnalysts, ({ one }) => ({
  workItem: one(workItems, { fields: [workItemBusinessAnalysts.workItemId], references: [workItems.id] }),
  user: one(users, { fields: [workItemBusinessAnalysts.userId], references: [users.id] }),
}))
