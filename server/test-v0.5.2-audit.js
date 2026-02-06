/**
 * v0.5.2: Audit Filters, Pagination & Export Tests
 * 
 * Prerequisites:
 * 1. Server running on localhost:3000
 * 2. DB initialized with audit logs
 * 3. Test Users: teacher_v5, student_v5_1, student_v5_2
 * 
 * Run:
 * node server/test-v0.5.2-audit.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const TEACHER_ID = 'teacher_v5_test';

// Helper: Simple HTTP Request
function request(method, path, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': headers['x-user-id'] || TEACHER_ID,
                'x-role': headers['x-role'] || 'teacher',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    // Check content type for CSV export
                    if (res.headers['content-type'] === 'text/csv') {
                        resolve({ status: res.statusCode, data: data, isCsv: true });
                    } else {
                        resolve({ status: res.statusCode, data: JSON.parse(data) });
                    }
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// Test Runner
async function runTests() {
    console.log('=== v0.5.2 Tests Start ===\n');
    let passed = 0;
    let failed = 0;

    async function test(name, fn) {
        process.stdout.write(`Testing: ${name}... `);
        try {
            await fn();
            console.log('✅ PASS\n');
            passed++;
        } catch (err) {
            console.log(`❌ FAIL: ${err.message}\n`);
            failed++;
        }
    }

    // 1. Setup: Create Class
    let CLASS_ID = null;
    await test('Setup: Create Class', async () => {
        const res = await request('POST', '/api/teacher/classes', { name: 'Audit Test Class' }, { 'x-user-id': TEACHER_ID });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        if (!res.data.id) throw new Error('No class ID returned');
        CLASS_ID = res.data.id;
    });

    // 2. Generate Invite
    let INVITE_CODE = null;
    await test('Generate Invite', async () => {
        const res = await request('POST', `/api/teacher/classes/${CLASS_ID}/invite`, { usageLimit: 10 }, { 'x-user-id': TEACHER_ID });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        INVITE_CODE = res.data.code;
    });

    // 3. Student Join
    await test('Student Join', async () => {
        const res = await request('POST', '/api/student/join', { code: INVITE_CODE }, { 'x-user-id': 'student_v5_test', 'x-role': 'student' });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    });

    // 4. Filter by Action
    await test('Filter by Action (JOIN_CLASS)', async () => {
        const res = await request('GET', `/api/teacher/audit?classId=${CLASS_ID}&action=JOIN_CLASS`, null, { 'x-user-id': TEACHER_ID });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        if (!res.data.items) throw new Error('Expected paginated response');
        const joinLogs = res.data.items.filter(l => l.action === 'JOIN_CLASS');
        if (joinLogs.length !== 1) throw new Error(`Expected 1 JOIN_CLASS log, got ${joinLogs.length}`);
        console.log(`   Found ${joinLogs.length} JOIN_CLASS logs`);
    });

    // 5. Filter by Role
    await test('Filter by Role (teacher)', async () => {
        const res = await request('GET', `/api/teacher/audit?classId=${CLASS_ID}&actor_role=teacher`, null, { 'x-user-id': TEACHER_ID });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        const teacherLogs = res.data.items.filter(l => l.actor_role === 'teacher');
        const studentLogs = res.data.items.filter(l => l.actor_role === 'student');
        if (studentLogs.length > 0) throw new Error('Expected only teacher logs');
        console.log(`   Found ${teacherLogs.length} teacher logs, ${studentLogs.length} student logs`);
    });

    // 6. Pagination
    await test('Pagination (Limit 2)', async () => {
        const res = await request('GET', `/api/teacher/audit?classId=${CLASS_ID}&limit=2&offset=0`, null, { 'x-user-id': TEACHER_ID });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        if (!res.data.items || res.data.items.length > 2) throw new Error('Expected max 2 items');
        if (!res.data.total && res.data.total !== 0) throw new Error('Missing total field');
        console.log(`   Total: ${res.data.total}, Got: ${res.data.items.length}`);
    });

    // 7. Order Ascending
    await test('Order Ascending', async () => {
        const res = await request('GET', `/api/teacher/audit?classId=${CLASS_ID}&order=asc&limit=10`, null, { 'x-user-id': TEACHER_ID });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        // Check order
        if (res.data.items.length >= 2) {
            const first = res.data.items[0].timestamp;
            const last = res.data.items[res.data.items.length - 1].timestamp;
            if (first > last) throw new Error('Expected ascending order');
        }
        console.log('   Order is ascending');
    });

    // 8. CSV Export
    await test('CSV Export', async () => {
        const res = await request('GET', `/api/teacher/audit/export?classId=${CLASS_ID}`, null, { 'x-user-id': TEACHER_ID });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        if (!res.isCsv) throw new Error('Expected CSV content type');
        const lines = res.data.trim().split('\n');
        if (lines.length < 2) throw new Error('Expected header + data rows');
        // Check header
        const header = lines[0];
        if (!header.includes('time') || !header.includes('actor_id')) throw new Error('Missing CSV headers');
        console.log(`   CSV Header: ${header}`);
    });

    // 9. RBAC: Student Cannot Access Audit
    await test('RBAC: Student 403 on Audit', async () => {
        const res = await request('GET', `/api/teacher/audit?classId=${CLASS_ID}`, null, { 'x-user-id': 'student_v5_test', 'x-role': 'student' });
        if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    });

    console.log(`\n=== Tests Complete: ${passed} PASS, ${failed} FAIL ===`);
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => console.error('Fatal Error:', err));
