/**
 * v0.5.3: Audit Export Tests
 * Tests: CSV fields, mode=page/all, RBAC
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const TEACHER_ID = 'teacher_v5_test';

function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
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
                    // Try to parse as JSON for non-CSV responses
                    const contentType = res.headers['content-type'] || '';
                    if (contentType.includes('json')) {
                        resolve({ 
                            status: res.statusCode, 
                            data: JSON.parse(data),
                            isCsv: false
                        });
                    } else if (contentType.includes('csv')) {
                        resolve({ 
                            status: res.statusCode, 
                            data: data,
                            isCsv: true
                        });
                    } else {
                        resolve({ 
                            status: res.statusCode, 
                            data: data,
                            isCsv: false
                        });
                    }
                } catch (e) {
                    resolve({ status: res.statusCode, data: data, isCsv: false });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
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
        const res = await request('POST', '/api/teacher/classes', { name: 'Export Test' });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        CLASS_ID = res.data.id;
        console.log(`   Class: ${CLASS_ID}`);
    });

    let INVITE_CODE = null;
    await test('Setup: Generate Invite', async () => {
        const res = await request('POST', `/api/teacher/classes/${CLASS_ID}/invite`);
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        INVITE_CODE = res.data.code || (res.data.items && res.data.items[0]?.code);
        if (!INVITE_CODE) throw new Error(`No code in response: ${JSON.stringify(res.data)}`);
        console.log(`   Code: ${INVITE_CODE}`);
    });

    await test('Setup: Student Join', async () => {
        if (!INVITE_CODE) { console.log(`   Skipped (no code)`); return; }
        const res = await request('POST', '/api/student/join', { code: INVITE_CODE }, { 'x-user-id': 'student_v553', 'x-role': 'student' });
        if (res.status !== 200 && res.status !== 404) throw new Error(`Status ${res.status}`); // May fail if already joined
        console.log(`   Join: ${res.status === 200 ? 'OK' : 'Already joined or failed'}`);
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
        console.log(`   Page mode: OK`);
    });

    // 4. Mode=All Test
    await test('Mode=All Export', async () => {
        const res = await request('GET', `/api/teacher/audit/export?classId=${CLASS_ID}&mode=all`);
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        if (!res.isCsv) throw new Error('Not CSV');
        console.log(`   All mode: OK (streaming)`);
    });

    // 5. RBAC: Student 403
    await test('RBAC: Student 403 on Export', async () => {
        const res = await request('GET', `/api/teacher/audit/export?classId=${CLASS_ID}`, null, { 'x-user-id': 'student_v553', 'x-role': 'student' });
        if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    });

    // 6. CSV Data Contains Audit Logs
    await test('CSV Contains Audit Data', async () => {
        const res = await request('GET', `/api/teacher/audit/export?classId=${CLASS_ID}`);
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        const lines = res.data.trim().split('\n');
        if (lines.length < 2) throw new Error('No data in export');
        console.log(`   Data rows: ${lines.length - 1}`);
    });

    console.log(`\n=== Result: ${passed} PASS, ${failed} FAIL ===`);
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => console.error('Fatal:', err));
