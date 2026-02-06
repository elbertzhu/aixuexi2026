# Installation Guide

## Prerequisites
*   **Node.js**: v18+
*   **Xcode**: 15+ (for iPad SwiftUI client)
*   **Git**: Latest

## Setup

### 1. Server Setup
```bash
cd server
npm install
```

### 2. Environment Configuration
Create `.env` in `server/`:
```bash
PORT=3000
AI_PROVIDER=mock
```
*(Note: For production, configure `AI_PROVIDER=minimax`)*

### 3. Start Server
```bash
npm start
```
Server runs on `http://localhost:3000`.

### 4. iPad Client Setup
1.  Open `client/AIXueXi.swiftpm` in Xcode.
2.  Select an iPad Simulator (e.g., iPad Pro 13").
3.  Build & Run (Cmd+R).

## Dependencies
*   **Server**: `express`, `sqlite3`, `body-parser`, `cors`, `dotenv`.
*   **Client**: SwiftUI (iOS 17+).

## Verification
1.  Server: `curl http://localhost:3000/health` -> `{"status":"ok"}`
2.  Client: Switch "Teacher" tab -> "Create Class".
