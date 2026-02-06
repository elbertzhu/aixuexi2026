# Deployment Checklist

## Pre-Flight
- [ ] **Code**: `git status` is clean. Latest tag is `v0.4.1`.
- [ ] **Deps**: `npm install` runs without error in `server/`.
- [ ] **Config**: `.env` exists with `PORT=3000`.
- [ ] **Port**: Port 3000 is available.
- [ ] **DB**: `data/user_stats.db` exists and is writable.

## Health Check
```bash
curl http://localhost:3000/health
```
**Expected**: `{"status":"ok", "version":"0.4.1"}`

## Integration Tests (Mock)
Run `npm test` in `server/` OR use curl:

### 1. Teacher: Create Class
```bash
curl -X POST http://localhost:3000/api/teacher/classes \
  -H "x-user-id: teacher_test" \
  -H "Content-Type: application/json" \
  -d '{"name":"Alpha Class"}'
```
**Expected**: `{"id":"...", "name":"Alpha Class"}`

### 2. Teacher: Generate Invite
*(Use the classId from Step 1)*
```bash
curl -X POST http://localhost:3000/api/teacher/classes/<CLASS_ID>/invite \
  -H "x-user-id: teacher_test"
```
**Expected**: `{"code":"...", "status":"active"}`

### 3. Student: Join Class
*(Use the code from Step 2)*
```bash
curl -X POST http://localhost:3000/api/student/join \
  -H "x-user-id: student_test" \
  -H "Content-Type: application/json" \
  -d '{"code":"<INVITE_CODE>"}'
```
**Expected**: `{"success":true}`

### 4. Teacher: Kick Student
*(Verify student is in class via dashboard first)*
```bash
curl -X DELETE http://localhost:3000/api/teacher/classes/<CLASS_ID>/members/student_test \
  -H "x-user-id: teacher_test"
```
**Expected**: `{"success":true}`

### 5. Student: Leave Class
```bash
curl -X POST http://localhost:3000/api/student/leave \
  -H "x-user-id: student_test" \
  -H "Content-Type: application/json" \
  -d '{"classId":"<CLASS_ID>"}'
```
**Expected**: `{"success":true}`
