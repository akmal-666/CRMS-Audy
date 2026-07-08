import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'
import { workItems } from './work-items'
import { users } from './users'

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  workItemId: text('work_item_id').notNull().references(() => workItems.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  assigneeId: text('assignee_id').references(() => users.id),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  workItemIdx: index('tasks_work_item_idx').on(table.workItemId),
}))

export const subtasks = sqliteTable('subtasks', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  taskIdx: index('subtasks_task_idx').on(table.taskId),
}))

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  workItem: one(workItems, { fields: [tasks.workItemId], references: [workItems.id] }),
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] }),
  subtasks: many(subtasks),
}))

export const subtasksRelations = relations(subtasks, ({ one }) => ({
  task: one(tasks, { fields: [subtasks.taskId], references: [tasks.id] }),
}))
