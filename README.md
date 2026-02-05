# AIXUEXI 2026 - AI 英语学习系统

## Project Status
**Current Version**: v0.3.0
**Phase**: Teacher Dashboard & RBAC

## Documentation
*   [Release Notes (v0.3.0)](docs/RELEASE_NOTES.md)
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
Checks: `curl http://localhost:3000/health`

### 2. Client
Open `client/ios/aixuexi2026.xcodeproj` in Xcode.

## Architecture
*   **Server**: Node.js, Express, SQLite3
*   **AI**: OpenRouter (Minimax/Gemini), Internal Mock

## Features
*   **Assessment**: Adaptive placement tests.
*   **SRS**: Spaced Repetition System.
*   **Dashboards**:
    *   Parent: Child progress monitoring.
    *   Teacher (v0.3.0): Class & Student analytics.
