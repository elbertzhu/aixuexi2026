# Deployment Checklist

- [ ] **Code**: `git status` is clean.
- [ ] **Deps**: `npm install` runs without error.
- [ ] **Config**: `.env` file exists with valid keys.
- [ ] **DB**: `data/user_stats.db` exists and is writable.
- [ ] **Port**: Port 3000 is available.
- [ ] **Health Check**: `GET /health` returns `{"status":"ok", "version":"0.3.0"}`.
- [ ] **RBAC Verification**:
    - [ ] `GET /api/teacher/dashboard/summary` as Teacher -> 200 OK.
    - [ ] `GET /api/teacher/dashboard/summary` as Student -> 403 Forbidden.
