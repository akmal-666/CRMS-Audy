-- Junction table for multiple Business Analysts per work item
-- Backward compatible: businessAnalystId in work_items still exists for legacy data
-- New assignments use this table instead

CREATE TABLE IF NOT EXISTS `work_item_business_analysts` (
  `id` text PRIMARY KEY NOT NULL,
  `work_item_id` text NOT NULL REFERENCES `work_items`(`id`) ON DELETE CASCADE,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `added_by` text NOT NULL,
  `created_at` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `wiba_work_item_idx` ON `work_item_business_analysts` (`work_item_id`);
CREATE INDEX IF NOT EXISTS `wiba_user_idx` ON `work_item_business_analysts` (`user_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `wiba_unique_idx` ON `work_item_business_analysts` (`work_item_id`, `user_id`);

-- Migrate existing businessAnalystId data to the new junction table
INSERT OR IGNORE INTO `work_item_business_analysts` (`id`, `work_item_id`, `user_id`, `added_by`, `created_at`)
SELECT
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))),
  `id`,
  `business_analyst_id`,
  'system',
  CAST(strftime('%s', 'now') AS INTEGER)
FROM `work_items`
WHERE `business_analyst_id` IS NOT NULL;
