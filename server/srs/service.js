const db = require('../stats/db');
const Algorithm = require('./algorithm');

module.exports = {
    // Get item state
    getItem: (userId, itemId) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM review_items WHERE user_id = ? AND item_id = ?', [userId, itemId], (err, row) => {
                if (err) reject(err);
                resolve(row ? {
                    userId: row.user_id,
                    itemId: row.item_id,
                    easeFactor: row.ease_factor,
                    interval: row.interval,
                    repetitions: row.repetitions,
                    dueDate: row.due_date,
                    lastReviewed: row.last_reviewed
                } : {
                    userId,
                    itemId,
                    easeFactor: 2.5,
                    interval: 0,
                    repetitions: 0,
                    dueDate: 0,
                    lastReviewed: 0
                });
            });
        });
    },

    // Process Review
    review: async (userId, itemId, quality) => {
        // 1. Get current state
        const current = await module.exports.getItem(userId, itemId);
        
        // 2. Calculate next
        const next = Algorithm.calculate(quality, current);
        
        // 3. Save
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`
                INSERT INTO review_items (user_id, item_id, ease_factor, interval, repetitions, due_date, last_reviewed)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, item_id) DO UPDATE SET
                    ease_factor=excluded.ease_factor,
                    interval=excluded.interval,
                    repetitions=excluded.repetitions,
                    due_date=excluded.due_date,
                    last_reviewed=excluded.last_reviewed
            `);
            
            const now = Date.now();
            stmt.run(userId, itemId, next.easeFactor, next.interval, next.repetitions, next.dueDate, now, function(err) {
                if (err) reject(err);
                resolve({ ...next, userId, itemId });
            });
            stmt.finalize();
        });
    },

    // Get Pending
    getPendingItems: (userId, limit = 10) => {
        return new Promise((resolve, reject) => {
            const now = Date.now();
            db.all('SELECT * FROM review_items WHERE user_id = ? AND due_date <= ? ORDER BY due_date ASC LIMIT ?', [userId, now, limit], (err, rows) => {
                if (err) reject(err);
                resolve(rows.map(r => ({
                    itemId: r.item_id,
                    dueDate: r.due_date,
                    interval: r.interval
                })));
            });
        });
    }
};
