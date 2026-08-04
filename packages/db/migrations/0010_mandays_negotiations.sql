-- Mandays negotiation tracking feature
-- Tracks Request -> Negotiate -> Approve flow for mandays optimization

CREATE TABLE `mandays_negotiations` (
  `id` text PRIMARY KEY NOT NULL,
  `work_item_id` text NOT NULL UNIQUE REFERENCES `work_items`(`id`) ON DELETE CASCADE,
  
  -- Three-stage tracking
  `mandays_requested` real NOT NULL,  -- Initial request (immutable)
  `mandays_negotiated` real,          -- BA/PM proposal (optional)
  `mandays_approved` real NOT NULL,   -- Final approved
  
  -- Negotiation metadata
  `negotiation_status` text NOT NULL DEFAULT 'none' CHECK(`negotiation_status` IN ('none', 'proposed', 'accepted', 'rejected', 'pending')),
  `negotiation_notes` text,
  `rejection_reason` text,
  
  -- Tracking
  `negotiated_by` text REFERENCES `users`(`id`),
  `negotiated_at` integer,
  `responded_by` text REFERENCES `users`(`id`),
  `responded_at` integer,
  
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE INDEX `mandays_negotiations_work_item_idx` ON `mandays_negotiations` (`work_item_id`);
CREATE INDEX `mandays_negotiations_status_idx` ON `mandays_negotiations` (`negotiation_status`);
