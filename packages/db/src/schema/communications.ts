import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'
import { workItems } from './work-items'
import { users } from './users'

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  workItemId: text('work_item_id').notNull().references(() => workItems.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id),
  guestName: text('guest_name'),
  content: text('content').notNull(),
  isEdited: integer('is_edited', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  workItemIdx: index('comments_work_item_idx').on(table.workItemId),
  userIdx: index('comments_user_idx').on(table.userId),
}))

export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey(),
  workItemId: text('work_item_id').notNull().references(() => workItems.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size').notNull(),
  mimeType: text('mime_type').notNull(),
  r2Key: text('r2_key').notNull(),
  uploadedBy: text('uploaded_by').references(() => users.id),
  uploadedByGuest: text('uploaded_by_guest'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  workItemIdx: index('attachments_work_item_idx').on(table.workItemId),
}))

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', {
    enum: ['assignment','mention','comment','status_change','due_date_reminder','go_live','deployment'],
  }).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  workItemId: text('work_item_id').references(() => workItems.id, { onDelete: 'cascade' }),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userIdx: index('notifications_user_idx').on(table.userId),
  isReadIdx: index('notifications_is_read_idx').on(table.isRead),
}))

export const activityLogs = sqliteTable('activity_logs', {
  id: text('id').primaryKey(),
  workItemId: text('work_item_id').notNull().references(() => workItems.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id),
  guestName: text('guest_name'),
  action: text('action').notNull(),
  description: text('description').notNull(),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  workItemIdx: index('activity_logs_work_item_idx').on(table.workItemId),
  createdAtIdx: index('activity_logs_created_at_idx').on(table.createdAt),
}))

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  action: text('action', {
    enum: ['login','logout','create','update','delete','status_change','assignment','deployment','comment','attachment_upload'],
  }).notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  oldValues: text('old_values', { mode: 'json' }).$type<Record<string, unknown>>(),
  newValues: text('new_values', { mode: 'json' }).$type<Record<string, unknown>>(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userIdx: index('audit_logs_user_idx').on(table.userId),
  entityIdx: index('audit_logs_entity_idx').on(table.entityType, table.entityId),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}))

export const commentsRelations = relations(comments, ({ one }) => ({
  workItem: one(workItems, { fields: [comments.workItemId], references: [workItems.id] }),
  user: one(users, { fields: [comments.userId], references: [users.id] }),
}))

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  workItem: one(workItems, { fields: [attachments.workItemId], references: [workItems.id] }),
  uploader: one(users, { fields: [attachments.uploadedBy], references: [users.id] }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  workItem: one(workItems, { fields: [notifications.workItemId], references: [workItems.id] }),
}))

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  workItem: one(workItems, { fields: [activityLogs.workItemId], references: [workItems.id] }),
  user: one(users, { fields: [activityLogs.userId], references: [users.id] }),
}))
