# Multi-Department Collaboration & Mandays Negotiation Features

## Overview

This document describes two new features added to the IT Workflow CRMS system:
1. **Multi-Department Collaboration**: Allow CRs to involve multiple departments
2. **Mandays Negotiation Tracking**: Track Request → Negotiate → Approve flow for cost optimization

## Feature 1: Multi-Department Collaboration

### Business Requirement
CRs can involve multiple departments beyond the primary requesting department. Users from collaborating departments should have view access to these CRs.

### Technical Implementation

#### Database Schema
**Table: `work_item_departments`**
```sql
CREATE TABLE work_item_departments (
  id TEXT PRIMARY KEY,
  work_item_id TEXT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'collaborating' CHECK(role IN ('primary', 'collaborating')),
  added_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(work_item_id, department_id)
);
```

**Migration**: `0009_work_item_departments.sql`

#### API Endpoints

**Base URL**: `/api/work-items/:workItemId/departments`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/:workItemId/departments` | Get all collaborating departments | Any authenticated user |
| POST | `/:workItemId/departments` | Add collaborating department | Admin, Manager, BA |
| DELETE | `/:workItemId/departments/:departmentId` | Remove collaborating department | Admin, Manager, BA |

**POST Request Body**:
```json
{
  "departmentId": "dept-uuid"
}
```

**GET Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "record-uuid",
      "workItemId": "wi-uuid",
      "departmentId": "dept-uuid",
      "role": "collaborating",
      "addedBy": "user-uuid",
      "createdAt": "2026-07-22T10:00:00Z",
      "department": {
        "id": "dept-uuid",
        "name": "Marketing",
        "code": "MKT"
      }
    }
  ]
}
```

#### Access Control Logic

**Current**: User can view CR if:
- User's email matches `requesterEmail` OR
- User's `departmentId` matches CR's `departmentId`

**New**: User can view CR if:
- User's email matches `requesterEmail` OR
- User's `departmentId` matches CR's `departmentId` (primary) OR
- User's `departmentId` matches any `workItemDepartments.departmentId` (collaborating)

#### Filter Behavior

**Department Filter**: 
- Show CRs where user's department is either primary OR collaborating
- Display badge showing role: "Marketing (Primary)" or "Marketing (Collaborating)"

**Executive Overview**:
- Group by primary department
- Show collaborating department count as badge

---

## Feature 2: Mandays Negotiation Tracking

### Business Requirement
Track mandays optimization through a Request → Negotiate → Approve workflow. Measure negotiation efficiency and savings for cost optimization reporting.

### Technical Implementation

#### Database Schema
**Table: `mandays_negotiations`**
```sql
CREATE TABLE mandays_negotiations (
  id TEXT PRIMARY KEY,
  work_item_id TEXT NOT NULL UNIQUE REFERENCES work_items(id) ON DELETE CASCADE,
  
  -- Three-stage tracking
  mandays_requested REAL NOT NULL,     -- Initial request (immutable)
  mandays_negotiated REAL,             -- BA/PM proposal (optional)
  mandays_approved REAL NOT NULL,      -- Final approved
  
  -- Negotiation metadata
  negotiation_status TEXT NOT NULL DEFAULT 'none' 
    CHECK(negotiation_status IN ('none', 'proposed', 'accepted', 'rejected', 'pending')),
  negotiation_notes TEXT,
  rejection_reason TEXT,
  
  -- Tracking
  negotiated_by TEXT REFERENCES users(id),
  negotiated_at INTEGER,
  responded_by TEXT REFERENCES users(id),
  responded_at INTEGER,
  
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**Migration**: `0010_mandays_negotiations.sql`

#### Workflow States

```
                ┌─────────────┐
                │    none     │ No negotiation needed
                └──────┬──────┘
                       │
                       ▼
                ┌─────────────┐
          ┌────▶│  proposed   │ BA/PM proposes reduction
          │     └──────┬──────┘
          │            │
          │            ├────────────┐
          │            │            │
          │            ▼            ▼
          │     ┌─────────────┐  ┌──────────┐
          └─────│  rejected   │  │ accepted │
                └─────────────┘  └──────────┘
```

**Status Descriptions**:
- `none`: No negotiation, requested = approved
- `proposed`: BA/PM has proposed a different amount, awaiting response
- `accepted`: Requester accepted the proposal
- `rejected`: Requester rejected the proposal (can re-propose)
- `pending`: (Future use for async approval workflows)

#### API Endpoints

**Base URL**: `/api/negotiations`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/:workItemId` | Get negotiation details | Any authenticated user |
| POST | `/:workItemId` | Create negotiation record | Admin, Manager, BA |
| PATCH | `/:workItemId/propose` | Propose negotiated mandays | Admin, Manager, BA |
| PATCH | `/:workItemId/respond` | Accept/reject proposal | Requester or Manager |
| GET | `/stats/summary` | Get negotiation statistics | Any authenticated user |

**POST /:workItemId - Create Negotiation**
```json
{
  "mandaysRequested": 45,
  "mandaysApproved": 45,
  "mandaysNegotiated": 35,  // optional
  "negotiationNotes": "Scope can be optimized using existing API"  // optional
}
```

**PATCH /:workItemId/propose - Propose Negotiation**
```json
{
  "mandaysNegotiated": 35,
  "negotiationNotes": "Analysis shows we can reuse existing components"
}
```

**PATCH /:workItemId/respond - Accept/Reject Proposal**
```json
{
  "action": "accept"  // or "reject"
  // "rejectionReason": "Still need full scope"  // required if reject
}
```

**GET /stats/summary - Negotiation Statistics**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRequested": 1250,
      "totalApproved": 980,
      "totalSaved": 270,
      "savingsPercentage": 21.6,
      "totalProjects": 45,
      "negotiatedProjects": 12,
      "negotiationRate": 26.7
    },
    "statusBreakdown": {
      "accepted": 35,
      "rejected": 8,
      "pending": 2
    },
    "topNegotiators": [
      {
        "id": "user-1",
        "name": "John Doe",
        "saved": 85,
        "count": 12
      }
    ],
    "departmentStats": [
      {
        "departmentId": "dept-1",
        "departmentName": "IT",
        "totalRequested": 450,
        "totalSaved": 130,
        "averageReduction": 28.9,
        "projectCount": 15
      }
    ],
    "recentNegotiations": [...]
  }
}
```

---

## Frontend Implementation (Phase 2 - TODO)

### 1. CR Detail Page - Multi-Department Section

**Location**: CR Detail Modal / Page

**UI Components**:
- Primary Department: Dropdown (single select, required)
- Collaborating Departments: Multi-select chips
- Add/Remove department buttons (role-based)

**Mockup**:
```
┌─────────────────────────────────────────────────────┐
│ Departments                                          │
├─────────────────────────────────────────────────────┤
│ Primary Department: [IT ▼]                          │
│                                                      │
│ Collaborating Departments:                          │
│ ┌──────────┐ ┌──────────┐                          │
│ │ Marketing│ │ Finance  │  [+ Add Department]      │
│ │    ✕     │ │    ✕     │                          │
│ └──────────┘ └──────────┘                          │
└─────────────────────────────────────────────────────┘
```

### 2. CR Detail Page - Mandays Negotiation Section

**Location**: CR Detail Modal / Page (below or alongside Mandays field)

**UI States**:

**State 1: No Negotiation (Initial)**
```
┌─────────────────────────────────────────────────────┐
│ Mandays Estimation                                   │
├─────────────────────────────────────────────────────┤
│ Requested: [45] days                                 │
│ Approved:  [45] days                                 │
│                                                      │
│ Status: No negotiation                              │
└─────────────────────────────────────────────────────┘
```

**State 2: Proposal Submitted (BA/PM view)**
```
┌─────────────────────────────────────────────────────┐
│ Mandays Negotiation                                  │
├─────────────────────────────────────────────────────┤
│ Requested:   45 days                                 │
│ Negotiated:  [35] days  [Propose]                    │
│ Approved:    45 days                                 │
│                                                      │
│ Notes: [Scope can be optimized...]                   │
│                                                      │
│ Status: Proposal submitted - awaiting response      │
└─────────────────────────────────────────────────────┘
```

**State 3: Proposal Received (Requester view)**
```
┌─────────────────────────────────────────────────────┐
│ Mandays Negotiation Proposal                         │
├─────────────────────────────────────────────────────┤
│ Your Request:    45 days                             │
│ BA Proposal:     35 days  (↓ 10 days / 22%)         │
│                                                      │
│ Reason: "Scope can be optimized using existing API" │
│                                                      │
│ [✓ Accept] [✕ Reject]                                │
│                                                      │
│ Rejection Reason: [____________] (if rejecting)      │
└─────────────────────────────────────────────────────┘
```

**State 4: Accepted**
```
┌─────────────────────────────────────────────────────┐
│ Mandays Negotiation                                  │
├─────────────────────────────────────────────────────┤
│ Requested:   45 days                                 │
│ Negotiated:  35 days  ✓ Accepted                     │
│ Approved:    35 days                                 │
│ Saved:       10 days (22.2%)                         │
│                                                      │
│ Status: Negotiation successful                      │
│ Negotiated by: John Doe (BA) on 2026-07-20         │
└─────────────────────────────────────────────────────┘
```

### 3. Mandays Report - New Metrics

**Location**: New report page or section in Executive Overview

**Cards to Add**:

```
┌──────────────────────────────┐  ┌──────────────────────────────┐
│ Negotiation Efficiency       │  │ Negotiation Success Rate     │
├──────────────────────────────┤  ├──────────────────────────────┤
│ Requested:    450 mandays    │  │ Accepted:    35 (77.8%)      │
│ Approved:     320 mandays    │  │ Rejected:    8  (17.8%)      │
│ Saved:        130 mandays    │  │ Pending:     2  (4.4%)       │
│               (28.9%)        │  │                               │
│                               │  │ Avg Reduction: 22.5%         │
│ Projects: 12/45 (26.7%)      │  └──────────────────────────────┘
└──────────────────────────────┘

┌──────────────────────────────┐  ┌──────────────────────────────┐
│ Top Negotiators              │  │ Department Performance       │
├──────────────────────────────┤  ├──────────────────────────────┤
│ 1. John (BA)   -85d (12 CRs) │  │ IT:        45% avg reduction │
│ 2. Sarah (PM)  -62d (9 CRs)  │  │ Finance:   32% avg reduction │
│ 3. Mike (BA)   -44d (8 CRs)  │  │ Marketing: 18% avg reduction │
└──────────────────────────────┘  └──────────────────────────────┘
```

**Negotiation List Table**:
```
┌────────────┬──────────┬─────────┬─────────┬─────────┬───────────┐
│ CR Number  │ Req.     │ Negot.  │ Final   │ Saved   │ By        │
├────────────┼──────────┼─────────┼─────────┼─────────┼───────────┤
│ CR-001234  │ 45 days  │ 35 days │ 35 days │ 10(22%) │ John      │
│ CR-001235  │ 30 days  │ 28 days │ 28 days │ 2 (7%)  │ Sarah     │
│ CR-001236  │ 60 days  │ -       │ 60 days │ 0       │ -         │
└────────────┴──────────┴─────────┴─────────┴─────────┴───────────┘
```

### 4. Filter Updates

**All Modules with Department Filter**:
- Kanban Board
- Requests List
- Dashboard
- Reports

**Filter Behavior**:
- "My Department" checkbox: Include both primary AND collaborating
- Department dropdown: Show "IT (5 primary, 3 collab)" format
- Badge on CR cards: Show if multi-department with count

**Example Badge on Kanban Card**:
```
┌────────────────────────────┐
│ CR-001234                  │
│ Database Migration         │
│                            │
│ IT (Primary)               │
│ +2 Departments             │  <- Shows collab count
│                            │
│ High | In Progress         │
└────────────────────────────┘
```

---

## Database Migration Guide

### Step 1: Apply Migrations

Run migrations in sequence:
```bash
# Apply on development
wrangler d1 execute it-workflow-db --local \
  --file=./packages/db/migrations/0009_work_item_departments.sql

wrangler d1 execute it-workflow-db --local \
  --file=./packages/db/migrations/0010_mandays_negotiations.sql

# Apply on production
wrangler d1 execute it-workflow-db --remote \
  --file=./packages/db/migrations/0009_work_item_departments.sql

wrangler d1 execute it-workflow-db --remote \
  --file=./packages/db/migrations/0010_mandays_negotiations.sql
```

### Step 2: Verify Tables

```sql
-- Check work_item_departments table
SELECT * FROM work_item_departments LIMIT 1;

-- Check mandays_negotiations table
SELECT * FROM mandays_negotiations LIMIT 1;
```

### Step 3: (Optional) Backfill Negotiation Data

For existing CRs with mandays, create negotiation records:
```sql
INSERT INTO mandays_negotiations (
  id, work_item_id, mandays_requested, mandays_approved, 
  negotiation_status, created_at, updated_at
)
SELECT 
  'neg-' || id,
  id,
  mandays,
  mandays,
  'none',
  created_at,
  updated_at
FROM work_items
WHERE mandays IS NOT NULL
AND id NOT IN (SELECT work_item_id FROM mandays_negotiations);
```

---

## Testing Checklist

### Multi-Department Feature
- [ ] Add collaborating department to CR
- [ ] Remove collaborating department from CR
- [ ] Verify business user from collaborating dept can view CR
- [ ] Verify filter shows CRs from both primary and collaborating depts
- [ ] Verify cannot add primary dept as collaborating dept
- [ ] Verify cannot add same dept twice
- [ ] Verify activity log shows department add/remove

### Mandays Negotiation Feature
- [ ] Create CR with negotiation record (no negotiation)
- [ ] BA proposes negotiation
- [ ] Requester accepts proposal
- [ ] Requester rejects proposal with reason
- [ ] Verify work_items.mandays updated on acceptance
- [ ] Verify activity logs show negotiation events
- [ ] Verify statistics endpoint returns correct calculations
- [ ] Verify top negotiators leaderboard
- [ ] Verify department statistics

### Integration Tests
- [ ] Multi-department CR shows in both departments' views
- [ ] Negotiated mandays reflected in reports
- [ ] Department filter works with multi-department CRs
- [ ] Permissions enforced (only BA/Manager can propose)

---

## API Usage Examples

### Example 1: Add Collaborating Department
```bash
curl -X POST https://api.audydental.com/api/work-items/wi-123/departments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"departmentId": "dept-marketing"}'
```

### Example 2: Propose Mandays Negotiation
```bash
curl -X PATCH https://api.audydental.com/api/negotiations/wi-123/propose \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "mandaysNegotiated": 35,
    "negotiationNotes": "Scope can be optimized"
  }'
```

### Example 3: Accept Negotiation
```bash
curl -X PATCH https://api.audydental.com/api/negotiations/wi-123/respond \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"action": "accept"}'
```

### Example 4: Get Negotiation Statistics
```bash
curl https://api.audydental.com/api/negotiations/stats/summary \
  -H "Authorization: Bearer <token>"
```

---

## Performance Considerations

### Indexes
All necessary indexes created:
- `work_item_departments_work_item_idx` - Fast lookup by work item
- `work_item_departments_department_idx` - Fast lookup by department
- `work_item_departments_unique_idx` - Prevent duplicates
- `mandays_negotiations_work_item_idx` - Fast negotiation lookup
- `mandays_negotiations_status_idx` - Fast status filtering

### Query Optimization
- Collaborating departments loaded with single query (no N+1)
- Negotiation stats use aggregation (no multiple round trips)
- Filters use indexed columns

### Caching Strategy
- Department list: Cache for 1 hour (rarely changes)
- Negotiation stats: Cache for 5 minutes (updates frequently)
- Work item details: Invalidate cache on negotiation accept/reject

---

## Future Enhancements

### Phase 3 (Optional)
1. **Email Notifications**
   - Notify requester when negotiation proposed
   - Notify BA when negotiation accepted/rejected

2. **Negotiation History Timeline**
   - Show full negotiation history with multiple rounds
   - Track counter-proposals

3. **Smart Negotiation Suggestions**
   - AI/rule-based suggestions based on similar CRs
   - "Similar CR completed in 25 days"

4. **Department Budget Tracking**
   - Track mandays budget per department per quarter
   - Alert when budget threshold reached

5. **Negotiation Templates**
   - Pre-defined negotiation reasons
   - Quick-select common scenarios

---

## Deployment Status

**Phase 1: Database & API** - COMPLETED
- [x] Database schema created
- [x] Migrations written
- [x] API endpoints implemented
- [x] Routes registered
- [x] Committed to repository

**Phase 2: Frontend UI** - IN PROGRESS
- [ ] CR detail page - multi-department UI
- [ ] CR detail page - negotiation UI
- [ ] Filter updates across modules
- [ ] Mandays report page
- [ ] Testing and refinement

**Phase 3: Testing & Deployment** - PENDING
- [ ] Apply migrations to dev database
- [ ] API endpoint testing
- [ ] Frontend integration testing
- [ ] Apply migrations to prod database
- [ ] Deploy to production

---

## Support & Contact

For questions or issues with these features:
- Technical Lead: [Name]
- Business Analyst: [Name]
- Documentation: This file + inline code comments
