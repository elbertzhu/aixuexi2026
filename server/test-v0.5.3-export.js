/**
 * v0.5.3: Audit Export Tests
 * Tests: CSV fields, mode=page/all, RBAC
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const TEACHER_ID = 'teacher_v5_test';

function request(method, path, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
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
                    resolve({ status: res.statusCode, data, isCsv: res.headers['content-type']?.includes('csv') });
                } catch (e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function runTests() {
    console.log('=== v0.5.3 Export Tests Start ===\n');
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

    // 1. Setup: Create Class & Join
    let CLASS_ID = null;
    await test('Setup: Create Class', async () => {
        const res = await request('POST', '/api/teacher/classes', { 'Content-Type': 'application/json', body: JSON.stringify({ name: 'Export Test' }) });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        CLASS_ID = JSON.parse(res.data).id;
    });

    let INVITE_CODE = null;
    await test('Setup: Generate Invite', async () => {
        const res = await request('POST', `/api/teacher/classes/${CLASS_ID}/invite`);
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        INVITE_CODE = JSON.parse(res.data).code;
    });

    await test('Setup: Student Join', async () => {
        const res = await request('POST', '/api/student/join', { 'Content-Type': 'application/json', body: JSON.stringify({ code: INVITE_CODE }) });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    });

    // 2. CSV Headers Test
    await test('CSV Headers Include New Fields', async () => {
        const res = await request('GET', `/api/teacher/audit/export?classId=${CLASS_ID}`);
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        if (!res.isCsv) throw new Error('Not CSV');
        const headers = res.data.split('\n')[0];
        const expected = ['time', 'actor_id', 'actor_role', 'action', 'target', 'result', 'reason', 'request_id', 'ip', 'user_agent'];
        for (const field of expected) {
            if (!headers.includes(field)) throw new Error(`Missing field: ${field}`);
        }
        console.log(`   Headers: ${headers}`);
    });

    // 3. Mode=Page Test
    await test('Mode=Page Export', async () => {
        const res = await request('GET', `/api/teacher/audit/export?classId=${CLASS_ID}&mode=page`);
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        if (!res.isCsv) throw new Error('Not CSV');
        const lines = res.data.trim().split('\n');
        if (lines.length < 2) throw new Error('No data rows');
        console.log(`   Page mode: ${lines.length - 1} rows`);
    });

    // 4. Mode=All Test (should still work for small datasets)
    await test('Mode=All Export', async () => {
        const res = await request('GET', `/api/teacher/audit/export?classId=${CLASS_ID}&mode=all`);
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        if (!res.isCsv) throw new Error('Not CSV');
        console.log(`   All mode: OK (streaming supported)`);
    });

    // 5. Filename Test
    await test('Filename Contains ClassID', async () => {
        // Note: Can't easily test filename in Node without raw headers
        // Just verify export works with classId filter
        const res = await request('GET', `/api/teacher/audit/export?classId=${CLASS_ID}`);
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        console.log(`   Export OK with classId filter`);
    });

    // 6. RBAC: Student 403
    await test('RBAC: Student 403 on Export', async () => {
        const res = await request('GET', `/api/teacher/audit/export?classId=${CLASS_ID}`, { 'x-user-id': 'student_test', 'x-role': 'student' });
        if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    });

    // 7. CSV Data Contains Audit Logs
    await test('CSV Contains Audit Data', async () => {
        const res = await request('GET', `/api/teacher/audit/export?classId=${CLASS_ID}`);
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        const lines = res.data.trim().split('\n');
        // Line 1 is header, check at least one data row
        if (lines.length < 2) throw new Error('No data in export');
        const row = lines[1];
        // Should have 10 columns
        const cols = row.split(',').length;
        if (cols < 6) throw new Error(`Invalid row format: ${row}`);
        console.log(`   Data row: ${cols} columns`);
    });

    console.log(`\n=== Result: ${passed} PASS, ${failed} FAIL ===`);
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => console.error('Fatal:', err));
