/**
 * v0.5.2: Audit Filters, Pagination & Export Tests
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const TEACHER_ID = 'teacher_v5_test';

function request(method, path, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search, // FIX: Include query params
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
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
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

    // 1. Create Class
    let CLASS_ID = null;
    await test('Create Class', async () => {
        const res = await request('POST', '/api/teacher/classes', { name: 'v0.5.2 Test' });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        CLASS_ID = res.data.id;
    });

    // 2. Generate Invite
    let INVITE_CODE = null;
    await test('Generate Invite', async () => {
        const res = await request('POST', `/api/teacher/classes/${CLASS_ID}/invite`, { usageLimit: 5 });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        INVITE_CODE = res.data.code;
    });

    // 3. Student Join
    await test('Student Join', async () => {
        const res = await request('POST', '/api/student/join', { code: INVITE_CODE }, { 'x-user-id': 'student_v552', 'x-role': 'student' });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    });

    // 4. Query Audit (Structure)
    await test('Query Audit', async () => {
        const res = await request('GET', `/api/teacher/audit?classId=${CLASS_ID}`);
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        if (!res.data.items) throw new Error('Missing items');
        if (typeof res.data.total !== 'number') throw new Error('Missing total');
        console.log(`   Total: ${res.data.total}`);
    });

    // 5. Filter by Action
    await test('Filter Action', async () => {
        const res = await request('GET', `/api/teacher/audit?classId=${CLASS_ID}&action=JOIN_CLASS`);
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        console.log(`   JOIN_CLASS logs: ${res.data.items.length}`);
    });

    // 6. Pagination
    await test('Pagination', async () => {
        const url = `/api/teacher/audit?classId=${CLASS_ID}&limit=1`;
        console.log(`   URL: ${url}`);
        const res = await request('GET', url);
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        console.log(`   Response: limit=${res.data.limit}, items=${res.data.items.length}`);
        if (res.data.items.length > 1) throw new Error(`Limit failed: got ${res.data.items.length}, limit=${res.data.limit}`);
        if (res.data.limit !== 1) throw new Error(`Limit field wrong: ${res.data.limit}`);
    });

    // 7. Order
    await test('Order Asc', async () => {
        const res = await request('GET', `/api/teacher/audit?classId=${CLASS_ID}&order=asc&limit=3`);
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        console.log(`   Order: ${res.data.items[0]?.timestamp}`);
    });

    // 8. CSV Export
    await test('CSV Export', async () => {
        const res = await request('GET', `/api/teacher/audit/export?classId=${CLASS_ID}`);
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        if (!res.data.includes('time,actor_id')) throw new Error('Not CSV');
        console.log(`   Header: ${res.data.split('\n')[0]}`);
    });

    // 9. RBAC
    await test('RBAC 403', async () => {
        const res = await request('GET', `/api/teacher/audit?classId=${CLASS_ID}`, null, { 'x-user-id': 'student_v552', 'x-role': 'student' });
        if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    });

    console.log(`\n=== Result: ${passed} PASS, ${failed} FAIL ===`);
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => console.error('Fatal:', err));
