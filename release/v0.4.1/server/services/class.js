const db = require('../stats/db');
const uuid = require('uuid');

// Helper: Generate clean code (6 chars, no 0/O/1/I)
function generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

module.exports = {
    createClass: (teacherId, name) => {
        return new Promise((resolve, reject) => {
            const id = uuid.v4();
            const stmt = db.prepare('INSERT INTO classes (id, teacher_id, name, created_at) VALUES (?, ?, ?, ?)');
            stmt.run(id, teacherId, name, Date.now(), (err) => {
                if (err) reject(err);
                else resolve({ id, teacherId, name });
            });
            stmt.finalize();
        });
    },

    // v0.4.0: Generate/Rotate Invite Code
    generateInvite: (classId, teacherId) => {
        return new Promise((resolve, reject) => {
            const code = generateInviteCode();
            const now = Date.now();
            
            db.serialize(() => {
                // 1. Revoke existing active codes
                const revokeStmt = db.prepare("UPDATE class_invites SET status = 'revoked' WHERE class_id = ? AND status = 'active'");
                revokeStmt.run(classId);
                revokeStmt.finalize();

                // 2. Insert new code
                const stmt = db.prepare('INSERT INTO class_invites (code, class_id, created_by, status, created_at) VALUES (?, ?, ?, ?, ?)');
                stmt.run(code, classId, teacherId, 'active', now, function(err) {
                    if (err) reject(err);
                    else resolve({ code, class_id: classId, status: 'active' });
                });
                stmt.finalize();
            });
        });
    },

    // v0.4.0: Get Active Invite
    getActiveInvite: (classId) => {
        return new Promise((resolve, reject) => {
            db.get("SELECT * FROM class_invites WHERE class_id = ? AND status = 'active'", [classId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    // v0.4.0: Verify Invite
    verifyInvite: (code) => {
        return new Promise((resolve, reject) => {
            db.get("SELECT * FROM class_invites WHERE code = ? AND status = 'active'", [code], (err, row) => {
                if (err) reject(err);
                if (!row) return resolve(null); // Invalid or revoked
                if (row.expires_at && row.expires_at < Date.now()) return resolve(null); // Expired
                resolve(row);
            });
        });
    },

    addMember: (classId, studentId) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('INSERT OR IGNORE INTO class_members (class_id, student_id, joined_at) VALUES (?, ?, ?)');
            stmt.run(classId, studentId, Date.now(), function(err) {
                if (err) reject(err);
                // this.changes could be 0 if already exists, but we resolve true anyway
                else resolve(true);
            });
            stmt.finalize();
        });
    },

    // v0.4.0: Remove Member
    removeMember: (classId, studentId) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('DELETE FROM class_members WHERE class_id = ? AND student_id = ?');
            stmt.run(classId, studentId, function(err) {
                if (err) reject(err);
                else resolve(this.changes > 0);
            });
            stmt.finalize();
        });
    },
    
    // v0.4.0: Check if class owner
    isClassOwner: (classId, teacherId) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT 1 FROM classes WHERE id = ? AND teacher_id = ?', [classId, teacherId], (err, row) => {
                if (err) reject(err);
                else resolve(!!row);
            });
        });
    },

    getTeacherClasses: (teacherId) => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM classes WHERE teacher_id = ?', [teacherId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    getClassMembers: (classId) => {
        return new Promise((resolve, reject) => {
             db.all('SELECT student_id FROM class_members WHERE class_id = ?', [classId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(r => r.student_id));
            });
        });
    },
    
    // Aggregated stats for a student list
    getStudentStatsBatch: (studentIds) => {
        if (!studentIds.length) return Promise.resolve([]);
        const placeholders = studentIds.map(() => '?').join(',');
        
        return new Promise((resolve, reject) => {
            // 1. Get Profiles (Accuracy)
            db.all(`SELECT user_id, stats, updated_at FROM profiles WHERE user_id IN (${placeholders})`, studentIds, (err, profiles) => {
                if (err) return reject(err);

                // 2. Get SRS Pending Counts
                // DB query for 'due_date < now'
                const now = Date.now();
                db.all(`SELECT user_id, count(*) as pending FROM review_items WHERE user_id IN (${placeholders}) AND due_date <= ? GROUP BY user_id`, [...studentIds, now], (err2, srsCounts) => {
                    if (err2) return reject(err2);
                    
                    // 3. Get Activity (Event count last 7 days)
                    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
                    db.all(`SELECT user_id, count(*) as activity FROM events WHERE user_id IN (${placeholders}) AND timestamp > ? GROUP BY user_id`, [...studentIds, sevenDaysAgo], (err3, activityCounts) => {
                        if (err3) return reject(err3);
                        
                        // Merge Data
                        const statsMap = {};
                        studentIds.forEach(id => {
                            statsMap[id] = { id, accuracy: 0, srs_pending: 0, activity_7d: 0, last_active: null };
                        });
                        
                        profiles.forEach(p => {
                            if (statsMap[p.user_id]) {
                                const parsed = JSON.parse(p.stats || '{}');
                                statsMap[p.user_id].accuracy = parsed.accuracy || 0;
                                statsMap[p.user_id].last_active = p.updated_at;
                            }
                        });
                        
                        srsCounts.forEach(r => {
                            if (statsMap[r.user_id]) statsMap[r.user_id].srs_pending = r.pending;
                        });

                         activityCounts.forEach(r => {
                            if (statsMap[r.user_id]) statsMap[r.user_id].activity_7d = r.activity;
                        });
                        
                        resolve(Object.values(statsMap));
                    });
                });
            });
        });
    }
};
