const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

// Simple fetch wrapper
const fetch = (url, options) => {
    return new Promise((resolve, reject) => {
        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, body: json });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
};

const BASE_URL = 'http://localhost:3002';

describe('v0.4.0 Class Invites & RBAC', async () => {
    const teacherHeaders = { 'x-user-id': 'teacher_v4_test', 'x-role': 'teacher' };
    const studentHeaders = { 'x-user-id': 'student_v4_test', 'x-role': 'student' };
    const parentHeaders = { 'x-user-id': 'parent_v4_test', 'x-role': 'parent' };
    
    let classId;
    let inviteCode;

    test('Teacher can create class', async () => {
        const res = await fetch(`${BASE_URL}/api/teacher/classes`, {
            method: 'POST',
            headers: { ...teacherHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Physics 101' })
        });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.id);
        classId = res.body.id;
    });

    test('Teacher can generate invite code', async () => {
        const res = await fetch(`${BASE_URL}/api/teacher/classes/${classId}/invite`, {
            method: 'POST',
            headers: teacherHeaders
        });
        assert.strictEqual(res.status, 200);
        assert.match(res.body.code, /^[A-Z2-9]{6}$/); // 6 chars, no confusing
        assert.strictEqual(res.body.status, 'active');
        inviteCode = res.body.code;
    });

    test('Student can join class with code', async () => {
        const res = await fetch(`${BASE_URL}/api/student/join`, {
            method: 'POST',
            headers: { ...studentHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: inviteCode })
        });
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.classId, classId);
    });

    test('Teacher sees student in class', async () => {
        const res = await fetch(`${BASE_URL}/api/teacher/dashboard/summary`, {
            headers: teacherHeaders
        });
        const cls = res.body.find(c => c.classId === classId);
        assert.ok(cls);
        assert.strictEqual(cls.studentCount, 1);
        assert.ok(cls.students.find(s => s.id === 'student_v4_test'));
    });

    test('Student CANNOT create class (RBAC)', async () => {
        const res = await fetch(`${BASE_URL}/api/teacher/classes`, {
            method: 'POST',
            headers: { ...studentHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Hacker Class' })
        });
        assert.strictEqual(res.status, 403);
    });

    test('Student CANNOT generate invite (RBAC)', async () => {
        const res = await fetch(`${BASE_URL}/api/teacher/classes/${classId}/invite`, {
            method: 'POST',
            headers: studentHeaders
        });
        assert.strictEqual(res.status, 403);
    });

    test('Teacher can rotate invite (old one invalid)', async () => {
        // Rotate
        const rotateRes = await fetch(`${BASE_URL}/api/teacher/classes/${classId}/invite`, {
            method: 'POST',
            headers: teacherHeaders
        });
        const newCode = rotateRes.body.code;
        assert.notStrictEqual(newCode, inviteCode);
        
        // Try join with OLD code (should fail)
        const res = await fetch(`${BASE_URL}/api/student/join`, {
            method: 'POST',
            headers: { ...studentHeaders, 'Content-Type': 'application/json' }, // student already in, but let's try with another or same
            // Actually service.addMember is idempotent/ignore, but verifyInvite returns null
            body: JSON.stringify({ code: inviteCode })
        });
        assert.strictEqual(res.status, 404);
    });

    test('Teacher can remove student', async () => {
        const res = await fetch(`${BASE_URL}/api/teacher/classes/${classId}/members/student_v4_test`, {
            method: 'DELETE',
            headers: teacherHeaders
        });
        assert.strictEqual(res.status, 200);

        // Verify count
        const summaryRes = await fetch(`${BASE_URL}/api/teacher/dashboard/summary`, {
            headers: teacherHeaders
        });
        const cls = summaryRes.body.find(c => c.classId === classId);
        assert.strictEqual(cls.studentCount, 0);
    });

    test('Student can leave class', async () => {
        // Re-join first (using current active code if I can get it, or generate new)
        const invRes = await fetch(`${BASE_URL}/api/teacher/classes/${classId}/invite`, {
            headers: teacherHeaders
        });
        const activeCode = invRes.body.code;

        await fetch(`${BASE_URL}/api/student/join`, {
            method: 'POST',
            headers: { ...studentHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: activeCode })
        });

        // Leave
        const leaveRes = await fetch(`${BASE_URL}/api/student/leave`, {
            method: 'POST',
            headers: { ...studentHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ classId })
        });
        assert.strictEqual(leaveRes.status, 200);

         // Verify count
         const summaryRes = await fetch(`${BASE_URL}/api/teacher/dashboard/summary`, {
            headers: teacherHeaders
        });
        const cls = summaryRes.body.find(c => c.classId === classId);
        assert.strictEqual(cls.studentCount, 0);
    });
});
