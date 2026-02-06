# Release Notes

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
