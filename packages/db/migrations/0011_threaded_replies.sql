-- Threaded replies system with reactions, mentions, and advanced features
-- Replaces simple comments table with enterprise-grade discussion system

-- Main replies table with threading support
CREATE TABLE `replies` (
  `id` text PRIMARY KEY NOT NULL,
  `work_item_id` text NOT NULL REFERENCES `work_items`(`id`) ON DELETE CASCADE,
  `parent_id` text REFERENCES `replies`(`id`) ON DELETE CASCADE,
  
  -- Author
  `user_id` text REFERENCES `users`(`id`),
  `guest_name` text,
  
  -- Content & mentions
  `content` text NOT NULL,
  `mentions` text DEFAULT '[]',
  
  -- Status flags
  `is_edited` integer NOT NULL DEFAULT 0,
  `is_resolved` integer NOT NULL DEFAULT 0,
  `is_pinned` integer NOT NULL DEFAULT 0,
  `is_deleted` integer NOT NULL DEFAULT 0,
  
  -- Resolved metadata
  `resolved_by` text REFERENCES `users`(`id`),
  `resolved_at` integer,
  
  -- Timestamps
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE INDEX `replies_work_item_idx` ON `replies` (`work_item_id`);
CREATE INDEX `replies_parent_idx` ON `replies` (`parent_id`);
CREATE INDEX `replies_user_idx` ON `replies` (`user_id`);
CREATE INDEX `replies_pinned_idx` ON `replies` (`is_pinned`);
CREATE INDEX `replies_resolved_idx` ON `replies` (`is_resolved`);
CREATE INDEX `replies_created_at_idx` ON `replies` (`created_at`);

-- Emoji reactions (Slack-style)
CREATE TABLE `reply_reactions` (
  `id` text PRIMARY KEY NOT NULL,
  `reply_id` text NOT NULL REFERENCES `replies`(`id`) ON DELETE CASCADE,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `emoji` text NOT NULL,
  `created_at` integer NOT NULL
);

CREATE INDEX `reply_reactions_reply_idx` ON `reply_reactions` (`reply_id`);
CREATE INDEX `reply_reactions_user_idx` ON `reply_reactions` (`user_id`);
CREATE UNIQUE INDEX `reply_reactions_unique_idx` ON `reply_reactions` (`reply_id`, `user_id`, `emoji`);

-- Reply attachments
CREATE TABLE `reply_attachments` (
  `id` text PRIMARY KEY NOT NULL,
  `reply_id` text NOT NULL REFERENCES `replies`(`id`) ON DELETE CASCADE,
  `file_name` text NOT NULL,
  `file_size` integer NOT NULL,
  `mime_type` text NOT NULL,
  `r2_key` text NOT NULL,
  `created_at` integer NOT NULL
);

CREATE INDEX `reply_attachments_reply_idx` ON `reply_attachments` (`reply_id`);

-- Read status tracking
CREATE TABLE `reply_read_status` (
  `id` text PRIMARY KEY NOT NULL,
  `reply_id` text NOT NULL REFERENCES `replies`(`id`) ON DELETE CASCADE,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `read_at` integer NOT NULL
);

CREATE INDEX `reply_read_status_reply_user_idx` ON `reply_read_status` (`reply_id`, `user_id`);
CREATE INDEX `reply_read_status_user_idx` ON `reply_read_status` (`user_id`);

-- CR Watchers
CREATE TABLE `work_item_watchers` (
  `id` text PRIMARY KEY NOT NULL,
  `work_item_id` text NOT NULL REFERENCES `work_items`(`id`) ON DELETE CASCADE,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `created_at` integer NOT NULL
);

CREATE INDEX `work_item_watchers_work_item_user_idx` ON `work_item_watchers` (`work_item_id`, `user_id`);
CREATE INDEX `work_item_watchers_user_idx` ON `work_item_watchers` (`user_id`);

-- Migrate existing comments to replies (if any exist)
INSERT INTO `replies` (
  `id`,
  `work_item_id`,
  `parent_id`,
  `user_id`,
  `guest_name`,
  `content`,
  `mentions`,
  `is_edited`,
  `is_resolved`,
  `is_pinned`,
  `is_deleted`,
  `created_at`,
  `updated_at`
)
SELECT 
  `id`,
  `work_item_id`,
  NULL as `parent_id`,
  `user_id`,
  `guest_name`,
  `content`,
  '[]' as `mentions`,
  `is_edited`,
  0 as `is_resolved`,
  0 as `is_pinned`,
  0 as `is_deleted`,
  CAST(strftime('%s', `created_at`) AS INTEGER) as `created_at`,
  CAST(strftime('%s', `updated_at`) AS INTEGER) as `updated_at`
FROM `comments`
WHERE EXISTS (SELECT 1 FROM `comments` LIMIT 1);

-- Drop old comments table
DROP TABLE IF EXISTS `comments`;
