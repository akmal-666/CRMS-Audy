-- Seed Data for CRMS

-- Departments
INSERT OR IGNORE INTO departments (id, name, code, is_active, created_at, updated_at) VALUES
  ('dept-001', 'Information Technology', 'IT', 1, unixepoch(), unixepoch()),
  ('dept-002', 'Finance', 'FIN', 1, unixepoch(), unixepoch()),
  ('dept-003', 'Human Resources', 'HR', 1, unixepoch(), unixepoch()),
  ('dept-004', 'Operations', 'OPS', 1, unixepoch(), unixepoch()),
  ('dept-005', 'Sales & Marketing', 'SALES', 1, unixepoch(), unixepoch()),
  ('dept-006', 'Procurement', 'PROC', 1, unixepoch(), unixepoch());

-- Branches
INSERT OR IGNORE INTO branches (id, name, code, department_id, is_active, created_at, updated_at) VALUES
  ('branch-001', 'Head Office', 'HO', NULL, 1, unixepoch(), unixepoch()),
  ('branch-002', 'Branch Jakarta', 'JKT', NULL, 1, unixepoch(), unixepoch()),
  ('branch-003', 'Branch Surabaya', 'SBY', NULL, 1, unixepoch(), unixepoch()),
  ('branch-004', 'Branch Bandung', 'BDG', NULL, 1, unixepoch(), unixepoch()),
  ('branch-005', 'Branch Medan', 'MDN', NULL, 1, unixepoch(), unixepoch());

-- Vendors
INSERT OR IGNORE INTO vendors (id, name, code, contact_person, email, is_active, created_at, updated_at) VALUES
  ('vendor-001', 'TechSoft Solutions', 'TSS', 'Ahmad Fauzi', 'contact@techsoft.co.id', 1, unixepoch(), unixepoch()),
  ('vendor-002', 'Digital Innovate', 'DI', 'Budi Santoso', 'info@digitalinnovate.id', 1, unixepoch(), unixepoch()),
  ('vendor-003', 'CloudSys Indonesia', 'CSI', 'Sari Dewi', 'hello@cloudsys.id', 1, unixepoch(), unixepoch());

-- Admin user (password: Admin@1234 - bcrypt hash placeholder)
INSERT OR IGNORE INTO users (id, email, name, password_hash, role, department_id, is_active, created_at, updated_at) VALUES
  ('user-admin', 'admin@crms.local', 'System Administrator', '$2b$12$placeholder_hash_admin', 'administrator', 'dept-001', 1, unixepoch(), unixepoch()),
  ('user-mgr01', 'manager@crms.local', 'IT Manager', '$2b$12$placeholder_hash_mgr', 'manager', 'dept-001', 1, unixepoch(), unixepoch()),
  ('user-ba01', 'analyst@crms.local', 'Business Analyst', '$2b$12$placeholder_hash_ba', 'business_analyst', 'dept-001', 1, unixepoch(), unixepoch()),
  ('user-dev01', 'developer@crms.local', 'Senior Developer', '$2b$12$placeholder_hash_dev', 'developer', 'dept-001', 1, unixepoch(), unixepoch()),
  ('user-qa01', 'qa@crms.local', 'QA Engineer', '$2b$12$placeholder_hash_qa', 'qa', 'dept-001', 1, unixepoch(), unixepoch());

-- Ticket counter initialization
INSERT OR IGNORE INTO ticket_counters (year, counter) VALUES (2026, 0);
