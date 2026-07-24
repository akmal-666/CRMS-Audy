CREATE TABLE `timeline_tasks` (
  `id` text PRIMARY KEY NOT NULL,
  `work_item_id` text NOT NULL REFERENCES `work_items`(`id`) ON DELETE CASCADE,
  `label` text NOT NULL,
  `start_date` integer NOT NULL,
  `end_date` integer NOT NULL,
  `color` text NOT NULL DEFAULT 'blue',
  `assignee_id` text REFERENCES `users`(`id`),
  `priority` text NOT NULL DEFAULT 'medium',
  `notes` text,
  `sort_order` integer NOT NULL DEFAULT 0,
  `created_by` text REFERENCES `users`(`id`),
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE INDEX `timeline_tasks_work_item_idx` ON `timeline_tasks` (`work_item_id`);
CREATE INDEX `timeline_tasks_start_date_idx` ON `timeline_tasks` (`start_date`);
