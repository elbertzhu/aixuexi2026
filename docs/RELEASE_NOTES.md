# Release Notes

## v0.5.1 (2026-02-06) - UI Integration for Anti-Abuse
**Client-Side Release (iPad SwiftUI)**

### Features
*   **Invite Usage Display**:
    *   Teacher: Shows usage count and progress bar (e.g., "2 / 30").
    *   Displays expiry date/time when set.
*   **Enhanced Error Handling**:
    *   Rate Limited (429): Shows "请求过于频繁，请稍后再试".
    *   Usage Limit Reached: Shows "邀请码已达使用上限".
    *   Expired Code: Shows "邀请码已过期".
*   **API Integration**:
    *   Updated `TeacherInvite` model with `usage_limit`, `usage_count`, `expires_at`.
    *   Added `AuditLog` model and `getAuditLogs` API for future UI.
*   **Stability**:
    *   Improved error parsing from server responses.

## v0.5.0 (2026-02-06) - Invite Anti-Abuse & Audit
**Backend Release**

### Features
*   **Invite Protection**:
    *   Added `usage_limit` (default 30) to prevent code sharing abuse.
    *   Added `expires_at` for temporary codes.
    *   Join fails if code is expired or usage limit reached.
*   **Rate Limiting**:
    *   `/api/student/join` limited to 5 requests/minute per user/IP.
    *   Returns 429 JSON on violation.
*   **Audit Logs**:
    *   New `audit_logs` table: `timestamp`, `actor_id`, `action`, `target`, `result`.
    *   Teachers can query via `GET /api/teacher/audit?classId=...`.
    *   Tracks: `CREATE_CLASS`, `ROTATE_INVITE`, `JOIN_CLASS`, `KICK_MEMBER`, `LEAVE_CLASS`.
*   **Security**:
    *   RBAC: Students/Parents cannot query audit logs (403).

### Tech
*   **Schema**: Extended `class_invites` with `usage_limit`, `usage_count`, `expires_at`, `revoked_at`. New `audit_logs` table.
*   **Service**: Added `incrementInviteUsage`, `getAuditLogs`, `logAudit`.

## v0.4.2 (2026-02-06) - UX & Error Handling
**Client-Side Release (iPad SwiftUI)**

### Features
*   **Invite Code Experience**:
    *   Teacher: Added one-tap "Copy to Clipboard" button with toast feedback.
    *   Student: Join input supports auto-paste from clipboard on appear.
    *   Auto-uppercase and trim whitespace for invite codes.
*   **Empty State Optimization**:
    *   Student "My Classes": Added illustration + "Join Class" call-to-action.
    *   Teacher Dashboard: Added illustration + "Create Class" call-to-action.
*   **Loading & Feedback**:
    *   All network buttons show `disabled` state during requests.
    *   Progress views added with localized Chinese labels ("加载中...", "生成中...").
*   **Error Handling (Chinese)**:
    *   403 Forbidden: Shows "无权限：请使用教师/学生账号登录".
    *   Network Error: Shows "网络异常，请重试".
    *   Service Error: Shows "操作失败：原因".

### Dependencies
*   No new dependencies.

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
