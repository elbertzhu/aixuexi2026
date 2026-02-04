const db = require('../stats/db');

module.exports = {
    // Create User
    createUser: (id, name, role) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('INSERT OR IGNORE INTO users (id, name, role, created_at) VALUES (?, ?, ?, ?)');
            stmt.run(id, name, role, Date.now(), (err) => {
                if (err) reject(err);
                else resolve({ id, name, role });
            });
            stmt.finalize();
        });
    },

    // Link Users
    linkUsers: (parentId, studentId) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('INSERT OR IGNORE INTO relations (parent_id, student_id) VALUES (?, ?)');
            stmt.run(parentId, studentId, (err) => {
                if (err) reject(err);
                else resolve(true);
            });
            stmt.finalize();
        });
    },

    // Get Linked Students
    getStudentsForParent: (parentId) => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT u.* FROM users u
                JOIN relations r ON u.id = r.student_id
                WHERE r.parent_id = ?
            `, [parentId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },
    
    getUser: (id) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
                if(err) reject(err);
                else resolve(row);
            });
        });
    }
};
