-- Remove branch_id and business_process columns
ALTER TABLE work_items DROP COLUMN branch_id;
ALTER TABLE work_items DROP COLUMN business_process;

-- Add manager_email column
ALTER TABLE work_items ADD COLUMN manager_email text;
