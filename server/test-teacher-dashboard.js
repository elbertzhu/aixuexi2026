const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const DB_PATH = path.join(__dirname, '..', 'data', 'user_stats.db');
const API_URL = 'http://localhost:3000/api';

const TEACHER_ID = 'teacher_v3_test';
const STUDENT_1 = 'student_v3_1';
const STUDENT_2 = 'student_v3_2';
const PARENT_ID = 'parent_v3_test';

function runQuery(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

async function seedData() {
    console.log('[Setup] Seeding DB...');
    const db = new sqlite3.Database(DB_PATH);
    
    // 1. Ensure Teacher exists with correct role
    await runQuery(db, 'DELETE FROM users WHERE id IN (?, ?, ?, ?)', [TEACHER_ID, STUDENT_1, STUDENT_2, PARENT_ID]);
    await runQuery(db, 'DELETE FROM classes WHERE teacher_id = ?', [TEACHER_ID]);
    // Note: Leaving events/profiles around or cleaning them up? Let's clean up for clean test
    await runQuery(db, 'DELETE FROM profiles WHERE user_id IN (?, ?)', [STUDENT_1, STUDENT_2]);
    
    // Create Users
    await runQuery(db, 'INSERT INTO users (id, name, role, created_at) VALUES (?, ?, ?, ?)', [TEACHER_ID, 'Mr. Test', 'teacher', Date.now()]);
    await runQuery(db, 'INSERT INTO users (id, name, role, created_at) VALUES (?, ?, ?, ?)', [STUDENT_1, 'Student A', 'student', Date.now()]);
    await runQuery(db, 'INSERT INTO users (id, name, role, created_at) VALUES (?, ?, ?, ?)', [STUDENT_2, 'Student B', 'student', Date.now()]);
    await runQuery(db, 'INSERT INTO users (id, name, role, created_at) VALUES (?, ?, ?, ?)', [PARENT_ID, 'Parent X', 'parent', Date.now()]);
    
    // Create Stats (Profiles)
    // Student 1: 80% accuracy
    const stats1 = JSON.stringify({ accuracy: 0.8, totalQuestions: 10 });
    await runQuery(db, 'INSERT INTO profiles (user_id, stats, dimensions, updated_at) VALUES (?, ?, ?, ?)', [STUDENT_1, stats1, '{}', Date.now()]);
    
    // Student 2: 50% accuracy
    const stats2 = JSON.stringify({ accuracy: 0.5, totalQuestions: 10 });
    await runQuery(db, 'INSERT INTO profiles (user_id, stats, dimensions, updated_at) VALUES (?, ?, ?, ?)', [STUDENT_2, stats2, '{}', Date.now()]);
    
    // Create Activity (Events)
    // Student 1: Active now. Use UUID or unique timestamp based ID to avoid UNIQUE constraint on re-runs if table not cleared properly
    const evtId = 'evt_' + Date.now() + Math.random();
    await runQuery(db, 'INSERT INTO events (id, user_id, type, payload, timestamp) VALUES (?, ?, ?, ?, ?)', [evtId, STUDENT_1, 'LOGIN', '{}', Date.now()]);
    
    db.close();
    console.log('[Setup] DB Seeded.');
}

async function checkRBAC(roleName, userId, endpoint = '/teacher/dashboard/summary') {
    const res = await fetch(`${API_URL}${endpoint}`, {
        headers: { 
            'Content-Type': 'application/json',
            'x-user-id': userId 
        }
    });

    if (res.status === 403) {
        console.log(`PASS: [RBAC] ${roleName} denied access to ${endpoint} (403)`);
    } else {
        throw new Error(`FAIL: [RBAC] ${roleName} got ${res.status} accessing ${endpoint}, expected 403`);
    }
}

async function runTests() {
    await seedData();
    
    const headers = { 
        'Content-Type': 'application/json',
        'x-user-id': TEACHER_ID 
    };

    console.log('\n[Test] 1. Create Class...');
    const createRes = await fetch(`${API_URL}/teacher/class`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Class 3-A' })
    });
    if (!createRes.ok) throw new Error(await createRes.text());
    const cls = await createRes.json();
    console.log('Class Created:', cls);
    
    console.log('\n[Test] 2. Add Members...');
    await fetch(`${API_URL}/teacher/class/${cls.id}/members`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ studentId: STUDENT_1 })
    });
    await fetch(`${API_URL}/teacher/class/${cls.id}/members`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ studentId: STUDENT_2 })
    });
    console.log('Members added.');

    console.log('\n[Test] 3. Get Dashboard Summary...');
    const summaryRes = await fetch(`${API_URL}/teacher/dashboard/summary`, { headers });
    const summary = await summaryRes.json();
    
    // Validation
    const classData = summary.find(c => c.classId === cls.id);
    if (!classData) throw new Error("Created class not found in summary");
    if (classData.studentCount !== 2) throw new Error(`Expected 2 students, got ${classData.studentCount}`);
    
    const s1 = classData.students.find(s => s.id === STUDENT_1);
    const s2 = classData.students.find(s => s.id === STUDENT_2);
    
    if (s1.accuracy !== 0.8) throw new Error(`Student A accuracy mismatch: ${s1.accuracy}`);
    if (s2.accuracy !== 0.5) throw new Error(`Student B accuracy mismatch: ${s2.accuracy}`);
    // Check >= 1 since activity can accumulate from failed runs (event not cleared in seedData)
    if (s1.activity_7d < 1) throw new Error(`Student A activity mismatch: ${s1.activity_7d}`);
    
    console.log('PASS: Dashboard Summary Valid');
    console.log('Data:', JSON.stringify(classData, null, 2));

    console.log('\n[Test] 4. Get Individual Student...');
    const detailRes = await fetch(`${API_URL}/teacher/dashboard/student/${STUDENT_1}`, { headers });
    const detail = await detailRes.json();
    if (detail.id !== STUDENT_1) throw new Error("ID mismatch");
    console.log('PASS: Student Detail Valid');

    console.log('\n[Test] 5. RBAC Negative Tests (P0)...');
    await checkRBAC('Student', STUDENT_1);
    await checkRBAC('Parent', PARENT_ID);
    
    console.log('\n=== v0.3.0 Teacher Dashboard Tests PASSED ===');
}

runTests().catch(err => {
    console.error('FAIL:', err);
    process.exit(1);
});
