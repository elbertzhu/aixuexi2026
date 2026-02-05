# Release Notes

## v0.3.0 (2026-02-05)
**Teacher Dashboard & RBAC**

### New Features
*   **Teacher Role**: Added `teacher` role to `users` table.
*   **Class Management**: backend support for `classes` and `class_members`.
*   **Dashboard API**:
    *   `GET /api/teacher/dashboard/summary`: Aggregated view of classes.
    *   `GET /api/teacher/dashboard/student/:id`: Individual student stats.
*   **RBAC**: Enforced role checks (`requireRole('teacher')`).

### Database Changes
*   New tables: `classes`, `class_members`.

### Fixes
*   Fixed OpenRouter 402 error with token caps.
