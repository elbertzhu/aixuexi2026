# Release Notes

## v0.4.1 (2026-02-06) - Class Management UI
**Client-Side Release (iPad SwiftUI)**

### Features
*   **Teacher Dashboard**:
    *   **Create Class**: Added "Create Class" button and modal sheet.
    *   **Invite Management**: Added QR/Code button to generate and rotate invite codes per class.
    *   **Kick Student**: Added "Kick" button next to student rows in list.
*   **Student Dashboard**:
    *   **My Classes**: New tab showing joined classes.
    *   **Join Class**: Modal sheet to enter invite code.
    *   **Leave Class**: Action to leave a class.
*   **Integration**:
    *   **API Service**: Updated to support new `/teacher/classes` and `/student/join` endpoints.
    *   **Models**: Added `TeacherInvite` and `JoinRequest`.

### Dependencies
*   Requires Server v0.4.0 (Backend API for classes/invites).

## v0.4.0 (2026-02-06) - Class Invites & Write APIs
**Backend & Database Release**

### Features
*   **Class Management**:
    *   `POST /api/teacher/classes`: Create new class.
    *   `POST /api/teacher/classes/:id/invite`: Generate/Rotate invite code.
    *   `DELETE /api/teacher/classes/:id/members/:studentId`: Remove student.
    *   `POST /api/student/join`: Join class via code.
    *   `POST /api/student/leave`: Leave class.

### Security
*   **RBAC**: Enforced via middleware (`requireRole`).
*   **Audit**: Revoked invites remain in DB with status flag.
*   **Anti-Abuse**: Invite codes are 6-char, rotating, and validated on join.

### Tech
*   **Schema**: New `class_invites` table added to `user_stats.db`.
*   **Service Layer**: `class.js` handles all DB operations for classes and invites.
