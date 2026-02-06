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

// v0.5.0: Audit Logger
// v0.5.3: Added request_id, ip, user_agent
function logAudit({ actorId, actorRole, action, target, result, reason = null, requestId = null, ip = null, userAgent = null }) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare('INSERT INTO audit_logs (timestamp, actor_id, actor_role, action, target, result, reason, request_id, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        stmt.run(Date.now(), actorId, actorRole, action, target, result, reason, requestId, ip, userAgent, (err) => {
            if (err) reject(err);
            else resolve();
        });
        stmt.finalize();
    });
}

module.exports = {
    createClass: (teacherId, name) => {
        return new Promise((resolve, reject) => {
            const id = uuid.v4();
            const stmt = db.prepare('INSERT INTO classes (id, teacher_id, name, created_at) VALUES (?, ?, ?, ?)');
            stmt.run(id, teacherId, name, Date.now(), (err) => {
                if (err) reject(err);
                else {
                    logAudit({ actorId: teacherId, actorRole: 'teacher', action: 'CREATE_CLASS', target: id, result: 'success' });
                    resolve({ id, teacherId, name });
                }
            });
            stmt.finalize();
        });
    },

    // v0.4.0: Generate/Rotate Invite Code
    // v0.5.0: Added usage_limit, expires_at, revoke logic
    generateInvite: (classId, teacherId, options = {}) => {
        return new Promise((resolve, reject) => {
            const code = generateInviteCode();
            const now = Date.now();
            const usageLimit = options.usageLimit || 30;
            const expiresAt = options.expiresAt || null; // Null means never expires

            db.serialize(() => {
                // 1. Revoke existing active codes
                const revokeStmt = db.prepare("UPDATE class_invites SET status = 'revoked', revoked_at = ? WHERE class_id = ? AND status = 'active'");
                revokeStmt.run(now, classId);
                revokeStmt.finalize();

                // 2. Insert new code
                const stmt = db.prepare('INSERT INTO class_invites (code, class_id, created_by, status, usage_limit, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
                stmt.run(code, classId, teacherId, 'active', usageLimit, expiresAt, now, function(err) {
                    if (err) reject(err);
                    else {
                        logAudit({ actorId: teacherId, actorRole: 'teacher', action: 'ROTATE_INVITE', target: `${classId}/${code}`, result: 'success' });
                        resolve({ code, class_id: classId, status: 'active', usage_limit: usageLimit, expires_at: expiresAt });
                    }
                    stmt.finalize();
                });
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
    // v0.5.0: Added usage_limit check
    verifyInvite: (code) => {
        return new Promise((resolve, reject) => {
            db.get("SELECT * FROM class_invites WHERE code = ? AND status = 'active'", [code], (err, row) => {
                if (err) reject(err);
                if (!row) return resolve(null); // Invalid or revoked
                if (row.expires_at && row.expires_at < Date.now()) return resolve(null); // Expired
                if (row.usage_count >= row.usage_limit) return resolve(null); // Usage limit reached
                resolve(row);
            });
        });
    },

    addMember: (classId, studentId) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('INSERT OR IGNORE INTO class_members (class_id, student_id, joined_at) VALUES (?, ?, ?)');
            stmt.run(classId, studentId, Date.now(), function(err) {
                if (err) reject(err);
                else resolve(true);
            });
            stmt.finalize();
        });
    },

    // v0.4.0: Remove Member
    // v0.5.0: Added Audit Log
    removeMember: (classId, studentId, actorId, actorRole) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('DELETE FROM class_members WHERE class_id = ? AND student_id = ?');
            stmt.run(classId, studentId, function(err) {
                if (err) reject(err);
                else {
                    if (this.changes > 0) {
                        logAudit({ actorId, actorRole, action: 'KICK_MEMBER', target: `${classId}/${studentId}`, result: 'success' });
                    }
                    resolve(this.changes > 0);
                }
            });
            stmt.finalize();
        });
    },

    // v0.5.0: Increment Invite Usage
    incrementInviteUsage: (code) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('UPDATE class_invites SET usage_count = usage_count + 1 WHERE code = ? AND status = "active"');
            stmt.run(code, function(err) {
                if (err) reject(err);
                else resolve(this.changes > 0);
            });
            stmt.finalize();
        });
    },

    // v0.5.2: Enhanced Audit Query
    getAuditLogs: (filters = {}) => {
        return new Promise((resolve, reject) => {
            let query = 'SELECT * FROM audit_logs WHERE 1=1';
            const params = [];
            
            if (filters.classId) {
                query += ' AND target LIKE ?';
                params.push(`${filters.classId}%`);
            }
            
            if (filters.actorId) {
                query += ' AND actor_id = ?';
                params.push(filters.actorId);
            }

            if (filters.action) {
                query += ' AND action = ?';
                params.push(filters.action);
            }
            
            if (filters.actorRole) {
                query += ' AND actor_role = ?';
                params.push(filters.actorRole);
            }

            if (filters.from) {
                query += ' AND timestamp >= ?';
                params.push(parseInt(filters.from));
            }

            if (filters.to) {
                query += ' AND timestamp <= ?';
                params.push(parseInt(filters.to));
            }

            // Order
            const order = filters.order === 'asc' ? 'ASC' : 'DESC';
            query += ` ORDER BY timestamp ${order}`;
            
            // Limit & Offset
            const limit = filters.limit ? parseInt(filters.limit) : 100;
            const offset = filters.offset ? parseInt(filters.offset) : 0;
            
            query += ` LIMIT ${limit} OFFSET ${offset}`;

            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve({
                    items: rows,
                    total: rows.length, // Note: This is page count, not total count. For true total, another query needed.
                    limit,
                    offset
                });
            });
        });
    },

    // v0.5.2: Count Audit Logs (for pagination)
    countAuditLogs: (filters = {}) => {
        return new Promise((resolve, reject) => {
            let query = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
            const params = [];
            
            if (filters.classId) {
                query += ' AND target LIKE ?';
                params.push(`${filters.classId}%`);
            }
            
            if (filters.action) {
                query += ' AND action = ?';
                params.push(filters.action);
            }
            
            if (filters.actorRole) {
                query += ' AND actor_role = ?';
                params.push(filters.actorRole);
            }

            if (filters.from) {
                query += ' AND timestamp >= ?';
                params.push(parseInt(filters.from));
            }

            if (filters.to) {
                query += ' AND timestamp <= ?';
                params.push(parseInt(filters.to));
            }

            db.get(query, params, (err, row) => {
                if (err) reject(err);
                else resolve(row.total);
            });
        });
    },

    // v0.5.0: Log Audit (Exported for routes)
    logAudit: logAudit,

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
