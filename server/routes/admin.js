const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../auth/middleware');
const classService = require('../services/class');

// v0.6.0: Admin Audit Routes
// Rate limiter for admin endpoints (30 req/min)
const adminRateLimitMap = new Map();
const ADMIN_RATE_LIMIT_WINDOW = 60 * 1000;
const ADMIN_RATE_LIMIT_MAX = 30;

function checkAdminRateLimit(key) {
    const now = Date.now();
    const record = adminRateLimitMap.get(key);
    
    if (!record || now - record.windowStart > ADMIN_RATE_LIMIT_WINDOW) {
        adminRateLimitMap.set(key, { windowStart: now, count: 1 });
        return true;
    }
    
    if (record.count >= ADMIN_RATE_LIMIT_MAX) {
        return false;
    }
    
    record.count++;
    return true;
}

// Apply Authentication
router.use(authenticate);

// Middleware: Admin Only
router.use(requireRole('admin'));

// v0.6.0 GET /api/admin/audit
// Global audit logs (cross-class)
router.get('/audit', async (req, res) => {
    try {
        // Rate Limit Check
        const rateKey = `${req.ip}:${req.user.id}`;
        if (!checkAdminRateLimit(rateKey)) {
            return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
        }

        const { classId, action, actor_role, from, to, limit, offset, order } = req.query;
        
        // Build filters - Admin can query all classes (classId is optional filter)
        const [items, total] = await Promise.all([
            classService.getAuditLogs({ 
                classId, // Admin: can specify classId or leave empty for all
                action, 
                actorRole: actor_role,
                from, 
                to,
                limit: limit || 100, 
                offset: offset || 0,
                order: order || 'desc'
            }),
            classService.countAuditLogs({ 
                classId,
                action, 
                actorRole: actor_role,
                from, 
                to 
            })
        ]);
        
        res.json({
            items: items.items,
            total,
            limit: items.limit,
            offset: items.offset
        });
    } catch (err) {
        console.error('Admin Audit Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// v0.6.0 GET /api/admin/audit/export
// Global audit export
router.get('/audit/export', async (req, res) => {
    try {
        const { classId, action, actor_role, from, to, order, mode } = req.query;
        
        // v0.6.0: mode=all requires from/to
        if (mode === 'all' && (!from || !to)) {
            return res.status(400).json({ error: "mode=all requires from and to parameters (ISO timestamps)" });
        }
        
        // Rate Limit Check
        const rateKey = `${req.ip}:${req.user.id}`;
        if (!checkAdminRateLimit(rateKey)) {
            return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
        }
        
        // CSV Headers (same as v0.5.3)
        const headers = [
            'time', 'actor_id', 'actor_role', 'action', 
            'target', 'result', 'reason', 
            'request_id', 'ip', 'user_agent'
        ];
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=admin_audit_${new Date().toISOString().slice(0,19).replace(/:/g,'')}.csv`);
        
        res.write(headers.join(',') + '\n');
        
        if (mode === 'all') {
            // Streaming mode
            const MAX_TOTAL = 500000; // Safety limit
            let offset = 0;
            const batchLimit = 1000;
            let totalWritten = 0;
            
            while (totalWritten < MAX_TOTAL) {
                const result = await classService.getAuditLogs({ 
                    classId, 
                    action, 
                    actorRole: actor_role,
                    from, 
                    to,
                    order: order || 'desc',
                    limit: batchLimit,
                    offset
                });
                
                if (result.items.length === 0) break;
                
                for (const row of result.items) {
                    const line = formatCsvRow(row);
                    res.write(line + '\n');
                    totalWritten++;
                }
                
                offset += batchLimit;
                
                if (result.items.length < batchLimit) break;
            }
            
            res.end();
        } else {
            // Page mode
            const result = await classService.getAuditLogs({ 
                classId, 
                action, 
                actorRole: actor_role,
                from, 
                to,
                order: order || 'desc',
                limit: 10000,
                offset: 0
            });
            
            for (const row of result.items) {
                const line = formatCsvRow(row);
                res.write(line + '\n');
            }
            
            res.end();
        }
    } catch (err) {
        console.error('Admin Export Error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
});

// Helper
function formatCsvRow(row) {
    const escape = (val) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    
    const time = row.timestamp ? new Date(row.timestamp).toISOString() : '';
    
    return [
        escape(time),
        escape(row.actor_id),
        escape(row.actor_role),
        escape(row.action),
        escape(row.target),
        escape(row.result),
        escape(row.reason),
        escape(row.request_id),
        escape(row.ip),
        escape(row.user_agent)
    ].join(',');
}

module.exports = router;
