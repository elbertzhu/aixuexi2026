# Decision Log

## v0.3.0 - Teacher Dashboard (2026-02-05)

### Context
Core need for 1-to-Many student monitoring by teachers.

### Decisions
1.  **Architecture**: Added `classes` and `class_members` tables. kept `users` table as single source of truth for identity (RBAC via `role` column).
2.  **Aggregation**: 
    *   Stats are aggregated on-read for simplicity (no pre-calculated counters yet). 
    *   `activity` metric defined as "event count in last 7 days".
    *   `srs_pending` is real-time count of due items.
    *   `accuracy` taken from latest user profile snapshot.
3.  **Scope Boundaries**:
    *   No UI frontend in this phase (API only).
    *   No automatic class enrollment; manual API `POST` required (or future invite code system).
    *   No modification to SRS algorithm.

### Schema Updates
*   New Table: `classes` (id, teacher_id, name, created_at)
*   New Table: `class_members` (class_id, student_id, joined_at)
