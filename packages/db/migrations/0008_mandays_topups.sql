-- Create mandays_topups table for tracking mandays top-up allocations
CREATE TABLE `mandays_topups` (
  `id` text PRIMARY KEY NOT NULL,
  `vendor_id` text NOT NULL REFERENCES `vendors`(`id`),
  `mandays` real NOT NULL,
  `notes` text,
  `created_by` text NOT NULL REFERENCES `users`(`id`),
  `created_at` integer NOT NULL
);

CREATE INDEX `mandays_topups_vendor_idx` ON `mandays_topups` (`vendor_id`);
CREATE INDEX `mandays_topups_created_at_idx` ON `mandays_topups` (`created_at`);
