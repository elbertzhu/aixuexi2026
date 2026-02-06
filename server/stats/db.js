const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure db directory exists
const dbDir = path.join(__dirname, '..', '..', 'data'); 
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'user_stats.db');
const db = new sqlite3.Database(dbPath);

function init() {
    db.serialize(() => {
        // Events Log (Immutable)
        db.run(`CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL,
            payload TEXT,
            timestamp INTEGER
        )`);

        // User Profiles (Snapshot)
        db.run(`CREATE TABLE IF NOT EXISTS profiles (
            user_id TEXT PRIMARY KEY,
            stats TEXT,
            dimensions TEXT,
            updated_at INTEGER
        )`);

        // SRS Items (E-Round)
        db.run(`CREATE TABLE IF NOT EXISTS review_items (
            user_id TEXT,
            item_id TEXT,
            ease_factor REAL,
            interval INTEGER,
            repetitions INTEGER,
            due_date INTEGER,
            last_reviewed INTEGER,
            PRIMARY KEY (user_id, item_id)
        )`);

        // v0.2.0: Users & Roles
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            role TEXT DEFAULT 'student',
            created_at INTEGER
        )`);

        // v0.2.0: Relations (Parent -> Student)
        db.run(`CREATE TABLE IF NOT EXISTS relations (
            parent_id TEXT,
            student_id TEXT,
            type TEXT DEFAULT 'parent',
            PRIMARY KEY (parent_id, student_id)
        )`);

        // v0.3.0: Classes
        db.run(`CREATE TABLE IF NOT EXISTS classes (
            id TEXT PRIMARY KEY,
            teacher_id TEXT,
            name TEXT,
            created_at INTEGER
        )`);

        // v0.3.0: Class Members
        db.run(`CREATE TABLE IF NOT EXISTS class_members (
            class_id TEXT,
            student_id TEXT,
            joined_at INTEGER,
            PRIMARY KEY (class_id, student_id)
        )`);

        // v0.4.0: Class Invites
        db.run(`CREATE TABLE IF NOT EXISTS class_invites (
            code TEXT PRIMARY KEY,
            class_id TEXT NOT NULL,
            created_by TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            expires_at INTEGER,
            created_at INTEGER
        )`, (err) => {
            if (err) console.error('Failed to create class_invites table:', err);
        });
        
        console.log('Stats DB Initialized at', dbPath);
    });
}

init();

module.exports = db;
