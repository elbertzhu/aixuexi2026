# Release Notes

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
