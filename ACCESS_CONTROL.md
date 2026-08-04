# Access Control Documentation

## Overview
CRMS menggunakan **Role-Based Access Control (RBAC)** dengan tambahan **Department-Level Access** untuk business users.

---

## User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **administrator** | Full system access | All CRs, all features |
| **manager** | Department/Branch manager | All CRs in system |
| **business_analyst** | BA assigned to projects | All CRs in system |
| **business_user** | Regular employee | **Own CRs + Department CRs** |
| **vendor** | External vendor | Assigned projects only |
| **guest** | Public submission | Tracking only |

---

## Business User Access Control

**business_user** memiliki akses berdasarkan **2 kriteria**:

### 1. ✅ **Own Requests (by Email)**
User bisa melihat semua CR yang mereka submit sendiri.

```typescript
requesterEmail === user.email
```

**Example:**
- John (john@company.com) submit CR-2026-00001
- John bisa melihat CR-2026-00001 (karena dia yang submit)

---

### 2. ✅ **Department Requests (by Department)**
User bisa melihat semua CR dari department yang sama.

```typescript
workItem.departmentId === user.departmentId
```

**Example:**
- John (john@company.com) - Finance Department
- Sarah (sarah@company.com) - Finance Department  
- Sarah submit CR-2026-00002 untuk Finance
- John bisa melihat CR-2026-00002 (karena sama-sama Finance)

---

## Access Logic (SQL)

### List Work Items (GET /api/work-items)
```sql
-- business_user can see:
WHERE (
  requester_email = 'john@company.com'  -- Own requests
  OR 
  department_id = 'dept-finance-001'     -- Department requests
)
```

### View Work Item Detail (GET /api/work-items/:id)
```typescript
// Check access
const isOwnRequest = item.requesterEmail === user.email
const isSameDepartment = user.departmentId && item.departmentId === user.departmentId

if (!isOwnRequest && !isSameDepartment) {
  return 404 // Not found (hide from unauthorized user)
}
```

---

## JWT Token Structure

JWT token includes **departmentId** untuk access control:

```json
{
  "sub": "user-abc-123",
  "email": "john@company.com",
  "name": "John Doe",
  "role": "business_user",
  "departmentId": "dept-finance-001",  // ← Department info
  "sessionId": "session-xyz-456",
  "iat": 1234567890,
  "exp": 1235000000
}
```

---

## Use Cases

### ✅ Scenario 1: Own Request
**John** submits CR untuk upgrade laptop.
- **John bisa:** View, edit (before assessment), comment
- **Sarah (Finance):** Bisa view & comment (same department)
- **Alice (IT):** Tidak bisa view (different department)

### ✅ Scenario 2: Department Request
**Sarah** (Finance) submits CR untuk new ERP module.
- **Sarah bisa:** View, edit, comment (own request)
- **John (Finance):** Bisa view & comment (same department)
- **Admin/Manager/BA:** Bisa view & manage (elevated roles)

### ✅ Scenario 3: No Department Assigned
**Bob** (no department) submits CR.
- **Bob bisa:** View own requests only
- **Other users:** Tidak bisa view (unless admin/manager/BA)

### ❌ Scenario 4: Different Department
**Alice** (IT) submits CR untuk server upgrade.
- **John (Finance):** Tidak bisa view (different department)
- **Sarah (Finance):** Tidak bisa view (different department)
- **Admin/Manager/BA:** Bisa view (elevated roles)

---

## Other Roles Access

### Administrator
```typescript
// No filtering - full access
const items = await db.query.workItems.findMany()
```

### Manager / Business Analyst
```typescript
// No filtering - full access (for management purposes)
const items = await db.query.workItems.findMany()
```

### Vendor
```typescript
// Only see work items where they are assigned as vendor
WHERE vendor_id = user.vendorId
```

---

## Security Notes

### ✅ **Benefits:**
1. **Data Privacy** - Users tidak bisa lihat CR dari department lain
2. **Collaboration** - Users bisa collaborate dengan team mereka
3. **Transparency** - Department visibility untuk koordinasi
4. **Scalability** - Easy to manage multi-department organizations

### 🔒 **Security Measures:**
1. JWT token includes departmentId (tamper-proof)
2. Server-side validation on every request
3. 404 response untuk unauthorized access (hide existence)
4. Audit logs untuk semua access attempts

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department_id TEXT REFERENCES departments(id),  -- ← Department link
  branch_id TEXT REFERENCES branches(id),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX users_department_idx ON users(department_id);
```

### Work Items Table
```sql
CREATE TABLE work_items (
  id TEXT PRIMARY KEY,
  ticket_number TEXT UNIQUE NOT NULL,
  department_id TEXT REFERENCES departments(id),  -- ← Request department
  requester_email TEXT NOT NULL,                   -- ← Submitter email
  status TEXT NOT NULL,
  -- ... other fields
);

CREATE INDEX work_items_requester_email_idx ON work_items(requester_email);
CREATE INDEX work_items_department_idx ON work_items(department_id);
```

---

## Testing Access Control

### Test Case 1: Own Request Access
```bash
# Login as John (Finance)
POST /api/auth/login
{
  "email": "john@company.com",
  "password": "password"
}

# Submit CR
POST /api/work-items
{
  "title": "Upgrade Laptop",
  "departmentId": "dept-finance-001",
  "requesterEmail": "john@company.com"
}

# Should see own CR
GET /api/work-items
# Response includes CR-2026-00001
```

### Test Case 2: Department Access
```bash
# Login as Sarah (Finance)
POST /api/auth/login
{
  "email": "sarah@company.com",
  "password": "password"
}

# Should see John's CR (same department)
GET /api/work-items
# Response includes CR-2026-00001 (John's CR)
```

### Test Case 3: Blocked Access
```bash
# Login as Alice (IT)
POST /api/auth/login
{
  "email": "alice@company.com",
  "password": "password"
}

# Should NOT see Finance CRs
GET /api/work-items
# Response does NOT include CR-2026-00001
```

---

## Migration Guide

### For Existing Users
1. **Assign departments** to all business_user accounts
2. **Re-login required** to refresh JWT token with departmentId
3. **Test access** after department assignment

### SQL Update
```sql
-- Assign users to departments
UPDATE users 
SET department_id = 'dept-finance-001' 
WHERE email IN ('john@company.com', 'sarah@company.com');

UPDATE users 
SET department_id = 'dept-it-001' 
WHERE email IN ('alice@company.com', 'bob@company.com');
```

---

## Future Enhancements

- [ ] **Branch-level access** (multi-location support)
- [ ] **Cross-department sharing** (with approval)
- [ ] **Custom access rules** per CR
- [ ] **Temporary access grants** (time-limited)
- [ ] **Access audit reports**

---

**Last Updated:** January 2026  
**Version:** 2.0  
**Status:** ✅ Production Ready
