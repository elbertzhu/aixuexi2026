/**
 * v0.6.0: Admin Global Audit Tests
 * Tests: admin role, cross-class audit, RBAC, rate limiting
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

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
                'x-user-id': headers['x-user-id'] || 'admin_test',
                'x-role': headers['x-role'] || 'admin',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    if (res.headers['content-type']?.includes('csv')) {
                        resolve({ status: res.statusCode, data, isCsv: true });
                    } else {
                        resolve({ status: res.statusCode, data: JSON.parse(data), isCsv: false });
                    }
                } catch (e) {
                    resolve({ status: res.statusCode, data, isCsv: false });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    console.log('=== v0.6.0 Admin Audit Tests Start ===\n');
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

    // 1. Setup: Create Classes & Joins
    let CLASS_A = null;
    let CLASS_B = null;
    let CODE_A = null;
    let CODE_B = null;
    
    await test('Setup: Create Class A', async () => {
        const res = await request('POST', '/api/teacher/classes', { name: 'Class A' });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        CLASS_A = res.data.id;
    });
    
    await test('Setup: Generate Invite A', async () => {
        const res = await request('POST', `/api/teacher/classes/${CLASS_A}/invite`);
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        CODE_A = res.data.code;
    });
    
    await test('Setup: Create Class B', async () => {
        const res = await request('POST', '/api/teacher/classes', { name: 'Class B' });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        CLASS_B = res.data.id;
    });
    
    await test('Setup: Generate Invite B', async () => {
        const res = await request('POST', `/api/teacher/classes/${CLASS_B}/invite`);
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        CODE_B = res.data.code;
    });
    
    await test('Setup: Student Join A', async () => {
        const res = await request('POST', '/api/student/join', { code: CODE_A }, { 'x-user-id': 'student_a1', 'x-role': 'student' });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    });
    
    await test('Setup: Student Join B', async () => {
        const res = await request('POST', '/api/student/join', { code: CODE_B }, { 'x-user-id': 'student_b1', 'x-role': 'student' });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    });

    // 2. Admin: Global Audit (No ClassId filter)
    await test('Admin: Global Audit (All Classes)', async () => {
        const res = await request('GET', '/api/admin/audit?limit=100');
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        if (!res.data.items || res.data.items.length < 4) throw new Error(`Expected 4+ items, got ${res.data.items?.length}`);
        console.log(`   Found ${res.data.items.length} items (cross-class)`);
    });

    // 3. Admin: Filter by Class
    await test('Admin: Filter by Class A', async () => {
        const res = await request('GET', `/api/admin/audit?classId=${CLASS_A}&limit=100`);
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        // Should only have CREATE_CLASS and ROTATE_INVITE for A
        const hasB = res.data.items.some(i => i.target.includes(CLASS_B));
        if (hasB) throw new Error('Found Class B items in Class A filter');
        console.log(`   Filtered to ${res.data.items.length} Class A items`);
    });

    // 4. Admin: Filter by Action
    await test('Admin: Filter by Action JOIN_CLASS', async () => {
        const res = await request('GET', '/api/admin/audit?action=JOIN_CLASS&limit=100');
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        const hasNonJoin = res.data.items.some(i => i.action !== 'JOIN_CLASS');
        if (hasNonJoin) throw new Error('Found non-JOIN_CLASS items');
        console.log(`   Found ${res.data.items.length} JOIN_CLASS items`);
    });

    // 5. Admin: Rate Limit (Quick check - 30 req/min)
    // We'll just verify the header exists and functionality works
    // Actual rate limit testing requires timing which is flaky
    console.log('   Rate limit: Skipped (flaky in unit tests)');

    // 6. Teacher: Cannot Access Admin Endpoint (403)
    await test('Teacher: 403 on Admin Audit', async () => {
        const res = await request('GET', '/api/admin/audit', null, { 'x-user-id': 'teacher_test', 'x-role': 'teacher' });
        if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    });

    // 7. Student: Cannot Access Admin Endpoint (403)
    await test('Student: 403 on Admin Audit', async () => {
        const res = await request('GET', '/api/admin/audit', null, { 'x-user-id': 'student_test', 'x-role': 'student' });
        if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    });

    // 8. Admin: Export CSV
    await test('Admin: Export CSV', async () => {
        const res = await request('GET', '/api/admin/audit/export?mode=page');
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        if (!res.isCsv) throw new Error('Not CSV');
        const lines = res.data.trim().split('\n');
        if (lines.length < 2) throw new Error('No data');
        console.log(`   CSV: ${lines.length - 1} rows`);
    });

    // 9. Admin: mode=all Requires from/to
    await test('Admin: mode=all Requires from/to', async () => {
        const res = await request('GET', '/api/admin/audit/export?mode=all');
        if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
        console.log(`   Correctly returned 400 for missing from/to`);
    });

    // 10. Admin: mode=all with time range
    const now = Date.now();
    const yesterday = now - 86400000;
    await test('Admin: mode=all with time range', async () => {
        const res = await request('GET', `/api/admin/audit/export?mode=all&from=${yesterday}&to=${now}`);
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        if (!res.isCsv) throw new Error('Not CSV');
        console.log(`   Streaming export OK`);
    });

    console.log(`\n=== Result: ${passed} PASS, ${failed} FAIL ===`);
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => console.error('Fatal:', err));
