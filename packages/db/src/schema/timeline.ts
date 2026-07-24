import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'
import { workItems } from './work-items'
import { users } from './users'

export const timelineTasks = sqliteTable('timeline_tasks', {
  id: text('id').primaryKey(),
  workItemId: text('work_item_id').notNull().references(() => workItems.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }).notNull(),
  color: text('color', {
    enum: ['blue', 'green', 'yellow', 'orange', 'red', 'purple'],
  }).notNull().default('blue'),
  assigneeId: text('assignee_id').references(() => users.id),
  priority: text('priority', {
    enum: ['low', 'medium', 'high', 'critical'],
  }).notNull().default('medium'),
  notes: text('notes'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdBy: text('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  workItemIdx: index('timeline_tasks_work_item_idx').on(table.workItemId),
  startDateIdx: index('timeline_tasks_start_date_idx').on(table.startDate),
}))

export const timelineTasksRelations = relations(timelineTasks, ({ one }) => ({
  workItem: one(workItems, { fields: [timelineTasks.workItemId], references: [workItems.id] }),
  assignee: one(users, { fields: [timelineTasks.assigneeId], references: [users.id] }),
  createdBy: one(users, { fields: [timelineTasks.createdBy], references: [users.id], relationName: 'timelineCreatedBy' }),
}))
