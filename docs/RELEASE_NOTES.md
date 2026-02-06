# Release Notes

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

## v0.3.2 (2026-02-06) - Teacher Dashboard UX
**Frontend Only Release**

### Features
*   **Teacher Dashboard Improvements**:
    *   **Filtering & Search**: Added global student search (by ID) and class filtering picker.
    *   **Sorting**: Added dynamic sorting by Activity, Accuracy, and SRS Pending count.
    *   **Visual Status Indicators**: 
        *   Added color-coded accuracy indicators (<0.6 yellow warning).
        *   Added orange badges for SRS pending items.
    *   **Feedback & States**:
        *   Implemented "Skeleton" loading screen for better perceived performance.
        *   Improved Error and 403 Forbidden states with retry options.
    *   **UI Polish**: Optimized layout for iPad/Tablet contexts.

## v0.3.1 (2026-02-05) - Teacher Dashboard UI
**Frontend Only Release**

### Features
*   **Teacher Dashboard**:
    *   Added `TeacherDashboardView` with class summary list.
    *   Added student list per class with activity/accuracy snapshots.
*   **Student Drill-down**:
    *   Added `TeacherStudentDetailView` for individual metrics.
*   **RBAC UI**:
    *   Implemented Identity Switcher (Teacher/Student/Parent) for dev testing.
    *   Added specific 403 Forbidden error card.

### Tech
*   **SwiftUI**: Use of `NavigationView`, `List`, `LazyVGrid`, `async/await`.
*   **Architecture**: MVVM pattern (`TeacherDashboardViewModel`, `APIService`).
