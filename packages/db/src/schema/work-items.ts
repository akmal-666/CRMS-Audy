import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'
import { departments, branches, vendors } from './departments'
import { users } from './users'
import { tasks } from './tasks'
import { comments, attachments, activityLogs } from './communications'

export const workItems = sqliteTable('work_items', {
  id: text('id').primaryKey(),
  ticketNumber: text('ticket_number').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  problemDescription: text('problem_description').notNull(),
  expectedSolution: text('expected_solution'),
  departmentId: text('department_id').notNull().references(() => departments.id),
  managerEmail: text('manager_email'),
  priority: text('priority', { enum: ['low','medium','high','critical'] }).notNull().default('medium'),
  status: text('status', {
    enum: ['in_pipeline','assessment','development','uat','deployment','go_live','drop'],
  }).notNull().default('in_pipeline'),
  requesterName: text('requester_name').notNull(),
  requesterEmail: text('requester_email').notNull(),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  goLiveDate: integer('go_live_date', { mode: 'timestamp' }),
  mandays: real('mandays'),
  managerId: text('manager_id').references(() => users.id),
  businessAnalystId: text('business_analyst_id').references(() => users.id),
  vendorId: text('vendor_id').references(() => vendors.id),
  developerId: text('developer_id').references(() => users.id),
  qaId: text('qa_id').references(() => users.id),
  isOverdue: integer('is_overdue', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  ticketIdx: index('work_items_ticket_idx').on(table.ticketNumber),
  statusIdx: index('work_items_status_idx').on(table.status),
  priorityIdx: index('work_items_priority_idx').on(table.priority),
  departmentIdx: index('work_items_department_idx').on(table.departmentId),
  createdAtIdx: index('work_items_created_at_idx').on(table.createdAt),
}))

export const assessments = sqliteTable('assessments', {
  id: text('id').primaryKey(),
  workItemId: text('work_item_id').notNull().unique().references(() => workItems.id, { onDelete: 'cascade' }),
  estimatedManDays: real('estimated_man_days'),
  estimatedHours: real('estimated_hours'),
  targetGoLive: integer('target_go_live', { mode: 'timestamp' }),
  complexity: text('complexity', { enum: ['low','medium','high'] }),
  risk: text('risk', { enum: ['low','medium','high','critical'] }),
  impact: text('impact', { enum: ['low','medium','high','critical'] }),
  technicalNotes: text('technical_notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const deployments = sqliteTable('deployments', {
  id: text('id').primaryKey(),
  workItemId: text('work_item_id').notNull().references(() => workItems.id, { onDelete: 'cascade' }),
  version: text('version').notNull(),
  deploymentDate: integer('deployment_date', { mode: 'timestamp' }).notNull(),
  deploymentNotes: text('deployment_notes'),
  rollbackPlan: text('rollback_plan'),
  deployedBy: text('deployed_by').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const assessmentsRelations = relations(assessments, ({ one }) => ({
  workItem: one(workItems, { fields: [assessments.workItemId], references: [workItems.id] }),
}))

export const deploymentsRelations = relations(deployments, ({ one }) => ({
  workItem: one(workItems, { fields: [deployments.workItemId], references: [workItems.id] }),
  deployedBy: one(users, { fields: [deployments.deployedBy], references: [users.id] }),
}))

export const workItemsRelations = relations(workItems, ({ one, many }) => ({
  department: one(departments, { fields: [workItems.departmentId], references: [departments.id] }),
  vendor: one(vendors, { fields: [workItems.vendorId], references: [vendors.id] }),
  manager: one(users, { fields: [workItems.managerId], references: [users.id], relationName: 'manager' }),
  businessAnalyst: one(users, { fields: [workItems.businessAnalystId], references: [users.id], relationName: 'businessAnalyst' }),
  developer: one(users, { fields: [workItems.developerId], references: [users.id], relationName: 'developer' }),
  qa: one(users, { fields: [workItems.qaId], references: [users.id], relationName: 'qa' }),
  assessment: one(assessments, { fields: [workItems.id], references: [assessments.workItemId] }),
  deployments: many(deployments),
  tasks: many(tasks),
  comments: many(comments),
  attachments: many(attachments),
  activityLogs: many(activityLogs),
}))
