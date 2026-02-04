const db = require('./db');

module.exports = {
  // Log Event (Async but expected fast)
  logEvent: (event) => {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare('INSERT INTO events (id, user_id, type, payload, timestamp) VALUES (?, ?, ?, ?, ?)');
        stmt.run(event.eventId, event.userId, event.type, JSON.stringify(event.payload), event.timestamp, function(err) {
            if (err) reject(err);
            else resolve(event);
        });
        stmt.finalize();
    });
  },
  
  getEventsByUser: (userId) => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM events WHERE user_id = ? ORDER BY timestamp ASC', [userId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(r => ({
                eventId: r.id,
                userId: r.user_id,
                type: r.type,
                timestamp: r.timestamp,
                payload: JSON.parse(r.payload)
            })));
        });
    });
  },

  // Get Profile (or default)
  getProfile: (userId) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM profiles WHERE user_id = ?', [userId], (err, row) => {
            if (err) reject(err);
            if (row) {
                resolve({
                    userId: row.user_id,
                    updatedAt: row.updated_at,
                    stats: JSON.parse(row.stats),
                    dimensions: JSON.parse(row.dimensions)
                });
            } else {
                // Return Baseline if not found
                resolve({
                    userId,
                    updatedAt: Date.now(),
                    stats: { totalQuestions: 0, correctCount: 0, accuracy: 0, avgSpeedMs: 0 },
                    dimensions: { vocabulary: 0, grammar: 0 }
                });
            }
        });
    });
  },

  saveProfile: (profile) => {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`
            INSERT INTO profiles (user_id, stats, dimensions, updated_at) 
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET 
                stats=excluded.stats, 
                dimensions=excluded.dimensions, 
                updated_at=excluded.updated_at
        `);
        stmt.run(
            profile.userId, 
            JSON.stringify(profile.stats), 
            JSON.stringify(profile.dimensions), 
            profile.updatedAt, 
            function(err) {
                if (err) { console.error('DB Save Error', err); reject(err); }
                else resolve();
            }
        );
        stmt.finalize();
    });
  }
};
