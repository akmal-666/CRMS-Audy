-- Fix: Ensure comments table exists for backward compatibility
-- The DB may or may not have 'comments' depending on whether migration 0011 ran
-- This migration safely creates comments table if it doesn't exist

CREATE TABLE IF NOT EXISTS `comments` (
  `id` text PRIMARY KEY NOT NULL,
  `work_item_id` text NOT NULL REFERENCES `work_items`(`id`) ON DELETE CASCADE,
  `user_id` text REFERENCES `users`(`id`),
  `guest_name` text,
  `content` text NOT NULL,
  `is_edited` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `comments_work_item_idx` ON `comments` (`work_item_id`);
CREATE INDEX IF NOT EXISTS `comments_user_idx` ON `comments` (`user_id`);

-- Also ensure replies and related tables exist
CREATE TABLE IF NOT EXISTS `replies` (
  `id` text PRIMARY KEY NOT NULL,
  `work_item_id` text NOT NULL REFERENCES `work_items`(`id`) ON DELETE CASCADE,
  `parent_id` text REFERENCES `replies`(`id`) ON DELETE CASCADE,
  `user_id` text REFERENCES `users`(`id`),
  `guest_name` text,
  `content` text NOT NULL,
  `mentions` text DEFAULT '[]',
  `is_edited` integer NOT NULL DEFAULT 0,
  `is_resolved` integer NOT NULL DEFAULT 0,
  `is_pinned` integer NOT NULL DEFAULT 0,
  `is_deleted` integer NOT NULL DEFAULT 0,
  `resolved_by` text REFERENCES `users`(`id`),
  `resolved_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `replies_work_item_idx` ON `replies` (`work_item_id`);
CREATE INDEX IF NOT EXISTS `replies_parent_idx` ON `replies` (`parent_id`);
CREATE INDEX IF NOT EXISTS `replies_user_idx` ON `replies` (`user_id`);
CREATE INDEX IF NOT EXISTS `replies_created_at_idx` ON `replies` (`created_at`);

CREATE TABLE IF NOT EXISTS `reply_reactions` (
  `id` text PRIMARY KEY NOT NULL,
  `reply_id` text NOT NULL REFERENCES `replies`(`id`) ON DELETE CASCADE,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `emoji` text NOT NULL,
  `created_at` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `reply_reactions_reply_idx` ON `reply_reactions` (`reply_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `reply_reactions_unique_idx` ON `reply_reactions` (`reply_id`, `user_id`, `emoji`);

CREATE TABLE IF NOT EXISTS `reply_attachments` (
  `id` text PRIMARY KEY NOT NULL,
  `reply_id` text NOT NULL REFERENCES `replies`(`id`) ON DELETE CASCADE,
  `file_name` text NOT NULL,
  `file_size` integer NOT NULL,
  `mime_type` text NOT NULL,
  `r2_key` text NOT NULL,
  `created_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `reply_read_status` (
  `id` text PRIMARY KEY NOT NULL,
  `reply_id` text NOT NULL REFERENCES `replies`(`id`) ON DELETE CASCADE,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `read_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `work_item_watchers` (
  `id` text PRIMARY KEY NOT NULL,
  `work_item_id` text NOT NULL REFERENCES `work_items`(`id`) ON DELETE CASCADE,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `created_at` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `work_item_watchers_work_item_user_idx` ON `work_item_watchers` (`work_item_id`, `user_id`);

-- Ensure work_item_departments table exists
CREATE TABLE IF NOT EXISTS `work_item_departments` (
  `id` text PRIMARY KEY NOT NULL,
  `work_item_id` text NOT NULL REFERENCES `work_items`(`id`) ON DELETE CASCADE,
  `department_id` text NOT NULL REFERENCES `departments`(`id`) ON DELETE CASCADE,
  `role` text NOT NULL DEFAULT 'collaborating',
  `added_by` text NOT NULL,
  `created_at` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `work_item_departments_work_item_idx` ON `work_item_departments` (`work_item_id`);

-- Ensure mandays_negotiations table exists
CREATE TABLE IF NOT EXISTS `mandays_negotiations` (
  `id` text PRIMARY KEY NOT NULL,
  `work_item_id` text NOT NULL UNIQUE REFERENCES `work_items`(`id`) ON DELETE CASCADE,
  `mandays_requested` real NOT NULL,
  `mandays_negotiated` real,
  `mandays_approved` real NOT NULL,
  `negotiation_status` text NOT NULL DEFAULT 'none',
  `negotiation_notes` text,
  `rejection_reason` text,
  `negotiated_by` text REFERENCES `users`(`id`),
  `negotiated_at` integer,
  `responded_by` text REFERENCES `users`(`id`),
  `responded_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
