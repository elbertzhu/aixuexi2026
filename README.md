# AIXUEXI 2026 - AI 英语学习系统

## Project Status
**Current Version**: v0.3.1 (Frontend) / v0.3.0 (Backend)
**Phase**: Teacher Dashboard & RBAC

## Documentation
*   [Release Notes (v0.3.1)](docs/RELEASE_NOTES.md)
*   [Installation Guide](docs/INSTALL.md)
*   [Deployment Checklist](docs/DEPLOY_CHECKLIST.md)
*   [Rollback Guide](docs/ROLLBACK.md)
*   [Decision Log](DECISION_LOG.md)

## Quick Start

### 1. Server (Backend)
```bash
cd server
npm install
npm start
```
*   Running at `http://localhost:3000`
*   Health check: `curl http://localhost:3000/health`
*   **Note**: Ensure DB is seeded for Teacher Dashboard (run `node server/test-teacher-dashboard.js` once if empty).

### 2. Client (iPad)
**Recommended Entry**: Open `client/AIXueXi.swiftpm` directly in Xcode. 

1.  **Open Project**: Double-click `client/AIXueXi.swiftpm` folder (or Open in Xcode).
2.  **Target**: Select **iPad Pro** (Simulator).
3.  **Run**: `Cmd + R`
4.  **Configuration**:
    *   **API URL**: Defaults to `http://localhost:3000/api` (See `APIService.swift`).
    *   **User ID**: Toggle the **Identity Picker** at the top of the "Teacher" tab to verify RBAC (`teacher_v3_test` vs `student_v3_1`).

## Architecture
*   **Server**: Node.js, Express, SQLite3
*   **Client**: SwiftUI (Swift Package Manager)
*   **AI**: OpenRouter (Minimax/Gemini), Internal Mock

## Features
*   **Assessment**: Adaptive placement tests.
*   **SRS**: Spaced Repetition System.
*   **Dashboards**:
    *   Parent: Child progress monitoring.
    *   Teacher (v0.3.1): Class overview & student detail drill-down (Read-Only).
