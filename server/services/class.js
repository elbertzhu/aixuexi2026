const db = require('../stats/db');
const uuid = require('uuid');

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

    addMember: (classId, studentId) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('INSERT OR IGNORE INTO class_members (class_id, student_id, joined_at) VALUES (?, ?, ?)');
            stmt.run(classId, studentId, Date.now(), (err) => {
                if (err) reject(err);
                else resolve(true);
            });
            stmt.finalize();
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
