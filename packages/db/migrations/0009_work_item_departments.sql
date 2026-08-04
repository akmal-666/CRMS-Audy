-- Multi-department collaboration feature
-- Allows CRs to involve multiple departments beyond the primary department

CREATE TABLE `work_item_departments` (
  `id` text PRIMARY KEY NOT NULL,
  `work_item_id` text NOT NULL REFERENCES `work_items`(`id`) ON DELETE CASCADE,
  `department_id` text NOT NULL REFERENCES `departments`(`id`) ON DELETE CASCADE,
  `role` text NOT NULL DEFAULT 'collaborating' CHECK(`role` IN ('primary', 'collaborating')),
  `added_by` text NOT NULL,
  `created_at` integer NOT NULL
);

CREATE INDEX `work_item_departments_work_item_idx` ON `work_item_departments` (`work_item_id`);
CREATE INDEX `work_item_departments_department_idx` ON `work_item_departments` (`department_id`);
CREATE UNIQUE INDEX `work_item_departments_unique_idx` ON `work_item_departments` (`work_item_id`, `department_id`);
