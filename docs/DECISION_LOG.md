# Decision Log

## v0.4.0 (2026-02-06) - Class Invites & Write APIs

**Decision:** Implement class invite codes and basic class management write operations (Create, Join, Leave, Kick).

**Key Choices:**
- **Invite Format:** 6-character alphanumeric (uppercase, stripped of confusing chars 0/O/1/I).
- **Invite Rotation:** Old codes are marked `revoked` rather than deleted for audit integrity.
- **API Scope:** Separate routes for Teacher (`/api/teacher`) and Student (`/api/student`) to enforce RBAC at the route level.
- **Persistence:** Invites stored in `class_invites` table (SQLite).

**Alternatives Considered:**
- Token-based invites vs. Simple Codes -> Chosen Simple Codes for ease of manual entry by students.
- Delete vs. Revoke on Rotate -> Chosen Revoke to keep history of rotations.

## v0.3.2 (2026-02-06) - Teacher Dashboard UX

**Decision:** Improve Teacher Dashboard usability on iPad without backend changes.

**Key Choices:**
- **Filtering:** Client-side filtering by Student ID.
- **Sorting:** Sort by Activity, Accuracy, SRS Count.
- **UI Polish:** Skeleton loading, clearer status badges.

## v0.3.1 (2026-02-05) - Teacher Dashboard UI

**Decision:** Initial Teacher Dashboard implementation.

**Key Choices:**
- **Stack:** Express + SQLite (Existing).
- **Auth:** Simple Header-based (`x-user-id`, `x-role`) for rapid prototyping.
- **Metrics:** Accuracy, SRS Pending, 7-Day Activity.
