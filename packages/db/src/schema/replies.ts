import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'
import { workItems } from './work-items'
import { users } from './users'

/**
 * Threaded replies/comments system
 * Supports nested replies, mentions, reactions, resolve/pin status
 */
export const replies = sqliteTable('replies', {
  id: text('id').primaryKey(),
  workItemId: text('work_item_id').notNull().references(() => workItems.id, { onDelete: 'cascade' }),
  
  // Threading support
  parentId: text('parent_id').references((): any => replies.id, { onDelete: 'cascade' }),
  
  // Author (can be user or guest)
  userId: text('user_id').references(() => users.id),
  guestName: text('guest_name'),
  
  // Content
  content: text('content').notNull(), // Markdown supported
  
  // Mentions (stored as JSON array of user IDs)
  mentions: text('mentions', { mode: 'json' }).$type<string[]>().default([]),
  
  // Status flags
  isEdited: integer('is_edited', { mode: 'boolean' }).notNull().default(false),
  isResolved: integer('is_resolved', { mode: 'boolean' }).notNull().default(false),
  isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  
  // Resolved metadata
  resolvedBy: text('resolved_by').references(() => users.id),
  resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  workItemIdx: index('replies_work_item_idx').on(table.workItemId),
  parentIdx: index('replies_parent_idx').on(table.parentId),
  userIdx: index('replies_user_idx').on(table.userId),
  pinnedIdx: index('replies_pinned_idx').on(table.isPinned),
  resolvedIdx: index('replies_resolved_idx').on(table.isResolved),
  createdAtIdx: index('replies_created_at_idx').on(table.createdAt),
}))

/**
 * Emoji reactions on replies (Slack-style)
 * Multiple users can react with same emoji
 */
export const replyReactions = sqliteTable('reply_reactions', {
  id: text('id').primaryKey(),
  replyId: text('reply_id').notNull().references(() => replies.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  emoji: text('emoji').notNull(), // Unicode emoji or :shortcode:
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  replyIdx: index('reply_reactions_reply_idx').on(table.replyId),
  userIdx: index('reply_reactions_user_idx').on(table.userId),
  // Ensure one user can only react once with same emoji to same reply
  uniqueReaction: index('reply_reactions_unique_idx').on(table.replyId, table.userId, table.emoji),
}))

/**
 * Attachments uploaded within replies
 */
export const replyAttachments = sqliteTable('reply_attachments', {
  id: text('id').primaryKey(),
  replyId: text('reply_id').notNull().references(() => replies.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size').notNull(),
  mimeType: text('mime_type').notNull(),
  r2Key: text('r2_key').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  replyIdx: index('reply_attachments_reply_idx').on(table.replyId),
}))

/**
 * Track read status of replies per user
 */
export const replyReadStatus = sqliteTable('reply_read_status', {
  id: text('id').primaryKey(),
  replyId: text('reply_id').notNull().references(() => replies.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  readAt: integer('read_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  replyUserIdx: index('reply_read_status_reply_user_idx').on(table.replyId, table.userId),
  userIdx: index('reply_read_status_user_idx').on(table.userId),
}))

/**
 * Watchers - users who want to be notified about CR updates
 */
export const workItemWatchers = sqliteTable('work_item_watchers', {
  id: text('id').primaryKey(),
  workItemId: text('work_item_id').notNull().references(() => workItems.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  workItemUserIdx: index('work_item_watchers_work_item_user_idx').on(table.workItemId, table.userId),
  userIdx: index('work_item_watchers_user_idx').on(table.userId),
}))

// Relations
export const repliesRelations = relations(replies, ({ one, many }) => ({
  workItem: one(workItems, { fields: [replies.workItemId], references: [workItems.id] }),
  user: one(users, { fields: [replies.userId], references: [users.id] }),
  parent: one(replies, { fields: [replies.parentId], references: [replies.id], relationName: 'thread' }),
  children: many(replies, { relationName: 'thread' }),
  reactions: many(replyReactions),
  attachments: many(replyAttachments),
  readStatus: many(replyReadStatus),
  resolver: one(users, { fields: [replies.resolvedBy], references: [users.id], relationName: 'resolver' }),
}))

export const replyReactionsRelations = relations(replyReactions, ({ one }) => ({
  reply: one(replies, { fields: [replyReactions.replyId], references: [replies.id] }),
  user: one(users, { fields: [replyReactions.userId], references: [users.id] }),
}))

export const replyAttachmentsRelations = relations(replyAttachments, ({ one }) => ({
  reply: one(replies, { fields: [replyAttachments.replyId], references: [replies.id] }),
}))

export const replyReadStatusRelations = relations(replyReadStatus, ({ one }) => ({
  reply: one(replies, { fields: [replyReadStatus.replyId], references: [replies.id] }),
  user: one(users, { fields: [replyReadStatus.userId], references: [users.id] }),
}))

export const workItemWatchersRelations = relations(workItemWatchers, ({ one }) => ({
  workItem: one(workItems, { fields: [workItemWatchers.workItemId], references: [workItems.id] }),
  user: one(users, { fields: [workItemWatchers.userId], references: [users.id] }),
}))
