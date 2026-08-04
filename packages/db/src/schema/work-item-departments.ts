import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'
import { workItems } from './work-items'
import { departments } from './departments'

/**
 * Junction table for multi-department collaboration
 * Allows CRs to involve multiple departments beyond the primary department
 */
export const workItemDepartments = sqliteTable('work_item_departments', {
  id: text('id').primaryKey(),
  workItemId: text('work_item_id').notNull().references(() => workItems.id, { onDelete: 'cascade' }),
  departmentId: text('department_id').notNull().references(() => departments.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['primary', 'collaborating'] }).notNull().default('collaborating'),
  addedBy: text('added_by').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  workItemIdx: index('work_item_departments_work_item_idx').on(table.workItemId),
  departmentIdx: index('work_item_departments_department_idx').on(table.departmentId),
  // Unique constraint: one department can only be added once per work item
  uniqueWorkItemDept: index('work_item_departments_unique_idx').on(table.workItemId, table.departmentId),
}))

export const workItemDepartmentsRelations = relations(workItemDepartments, ({ one }) => ({
  workItem: one(workItems, { fields: [workItemDepartments.workItemId], references: [workItems.id] }),
  department: one(departments, { fields: [workItemDepartments.departmentId], references: [departments.id] }),
}))
