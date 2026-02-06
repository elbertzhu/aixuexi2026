const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../auth/middleware');
const classService = require('../services/class');

// Apply Authentication (populates req.user)
router.use(authenticate);

// Middleware: Teacher Only
router.use(requireRole('teacher'));

// GET /api/teacher/dashboard/summary
// Returns list of classes with student summaries inside
router.get('/dashboard/summary', async (req, res) => {
    try {
        const teacherId = req.user.id;
        const classes = await classService.getTeacherClasses(teacherId);
        
        const result = [];
        for (const cls of classes) {
            const studentIds = await classService.getClassMembers(cls.id);
            const stats = await classService.getStudentStatsBatch(studentIds);
            
            result.push({
                classId: cls.id,
                className: cls.name,
                studentCount: studentIds.length,
                students: stats
            });
        }
        
        res.json(result); // Root array implies multiple classes possible
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch dashboard summary" });
    }
});

// GET /api/teacher/dashboard/student/:id
// Returns detailed stats for a specific student
router.get('/dashboard/student/:id', async (req, res) => {
    try {
        const studentId = req.params.id;
        // Ideally verify student is in teacher's class, skipping for v0.3.0 scope
        const stats = await classService.getStudentStatsBatch([studentId]);
        if (!stats.length) return res.status(404).json({ error: "Student not found" });
        
        res.json(stats[0]);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch student stats" });
    }
});

// v0.5.0 POST /api/teacher/classes
// Create a new class
router.post('/classes', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({error: "Class name required"});
        const newClass = await classService.createClass(req.user.id, name);
        
        // v0.5.3: Audit with ip/ua
        await classService.logAudit({
            actorId: req.user.id,
            actorRole: 'teacher',
            action: 'CREATE_CLASS',
            target: newClass.id,
            result: 'success',
            requestId: req.headers['x-request-id'] || null,
            ip: req.ip || req.connection?.remoteAddress || null,
            userAgent: req.headers['user-agent'] || null
        });
        
        res.json(newClass);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// v0.4.0 POST /api/teacher/classes/:id/invite
// Generate or Rotate invite code
router.post('/classes/:id/invite', async (req, res) => {
    try {
        const classId = req.params.id;
        // Security: Check ownership
        const isOwner = await classService.isClassOwner(classId, req.user.id);
        if (!isOwner) return res.status(403).json({ error: "Not authorized for this class" });

        // v0.5.0: Pass options (usageLimit, expiresAt)
        const options = {};
        if (req.body.usageLimit) options.usageLimit = req.body.usageLimit;
        if (req.body.expiresAt) options.expiresAt = req.body.expiresAt;

        const invite = await classService.generateInvite(classId, req.user.id, options);
        
        // v0.5.3: Audit with ip/ua
        await classService.logAudit({
            actorId: req.user.id,
            actorRole: 'teacher',
            action: 'ROTATE_INVITE',
            target: `${classId}/${invite.code}`,
            result: 'success',
            requestId: req.headers['x-request-id'] || null,
            ip: req.ip || req.connection?.remoteAddress || null,
            userAgent: req.headers['user-agent'] || null
        });
        
        res.json(invite);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// v0.4.0 GET /api/teacher/classes/:id/invite
// Get active invite code
router.get('/classes/:id/invite', async (req, res) => {
    try {
        const classId = req.params.id;
        const isOwner = await classService.isClassOwner(classId, req.user.id);
        if (!isOwner) return res.status(403).json({ error: "Not authorized for this class" });

        const invite = await classService.getActiveInvite(classId);
        res.json(invite || { status: 'none' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// v0.4.0 DELETE /api/teacher/classes/:id/members/:studentId
// Remove student from class
// v0.5.3: Added ip/ua to audit
router.delete('/classes/:id/members/:studentId', async (req, res) => {
    try {
        const { id: classId, studentId } = req.params;
        const isOwner = await classService.isClassOwner(classId, req.user.id);
        if (!isOwner) return res.status(403).json({ error: "Not authorized for this class" });

        await classService.removeMember(classId, studentId, req.user.id, 'teacher');
        
        // v0.5.3: Audit with ip/ua
        await classService.logAudit({
            actorId: req.user.id,
            actorRole: 'teacher',
            action: 'KICK_MEMBER',
            target: `${classId}/${studentId}`,
            result: 'success',
            requestId: req.headers['x-request-id'] || null,
            ip: req.ip || req.connection?.remoteAddress || null,
            userAgent: req.headers['user-agent'] || null
        });
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// v0.5.0 GET /api/teacher/audit
// Query audit logs with filters and pagination
router.get('/audit', async (req, res) => {
    try {
        const { classId, action, actor_role, from, to, limit, offset, order } = req.query;
        
        const [items, total] = await Promise.all([
            classService.getAuditLogs({ 
                classId, 
                action, 
                actorRole: actor_role,
                from, 
                to,
                limit, 
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
        res.status(500).json({ error: err.message });
    }
});

// v0.5.3 GET /api/teacher/audit/export
// Enhanced CSV export with more fields and mode support
router.get('/audit/export', async (req, res) => {
    try {
        const { classId, action, actor_role, from, to, order, mode } = req.query;
        
        // v0.5.3: CSV Headers - stable order
        const headers = [
            'time', 'actor_id', 'actor_role', 'action', 
            'target', 'result', 'reason', 
            'request_id', 'ip', 'user_agent'
        ];
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit_${classId || 'all'}_${new Date().toISOString().slice(0,19).replace(/:/g,'')}.csv`);
        
        // Write headers
        res.write(headers.join(',') + '\n');
        
        if (mode === 'all') {
            // Streaming mode: fetch in batches and stream
            const MAX_TOTAL = 100000; // Safety limit
            let offset = 0;
            const limit = 1000;
            let totalWritten = 0;
            
            while (totalWritten < MAX_TOTAL) {
                const result = await classService.getAuditLogs({ 
                    classId, 
                    action, 
                    actorRole: actor_role,
                    from, 
                    to,
                    order: order || 'desc',
                    limit,
                    offset
                });
                
                if (result.items.length === 0) break;
                
                for (const row of result.items) {
                    const line = formatCsvRow(row);
                    res.write(line + '\n');
                    totalWritten++;
                }
                
                offset += limit;
                
                // If we got fewer than limit, we're done
                if (result.items.length < limit) break;
            }
            
            res.end();
        } else {
            // Page mode (default): limited export
            const result = await classService.getAuditLogs({ 
                classId, 
                action, 
                actorRole: actor_role,
                from, 
                to,
                order: order || 'desc',
                limit: 10000, // Max for page mode
                offset: 0
            });
            
            for (const row of result.items) {
                const line = formatCsvRow(row);
                res.write(line + '\n');
            }
            
            res.end();
        }
    } catch (err) {
        console.error('Export error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
});

// Helper to format CSV row
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


// Deprecated Helper (v0.3.0 legacy, kept for backward compat if any tests use it, but prefer POST /classes)
router.post('/class', async (req, res) => {
    // ... Redirect logic or keep as specific helper
    // For now, just alias to the new one logic or return 410?
    // Let's keep it working as it was for seeding scripts
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({error: "Class name required"});
        const newClass = await classService.createClass(req.user.id, name);
        res.json(newClass);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Deprecated Helper (v0.3.0 legacy)
router.post('/class/:id/members', async (req, res) => {
    try {
        // Warning: This legacy helper didn't check ownership strictly in v0.3.0
        // We should probably enforce it now or warn.
        // For v0.4.0 strictness, let's enforce ownership even on this legacy endpoint.
        const isOwner = await classService.isClassOwner(req.params.id, req.user.id);
        if (!isOwner) return res.status(403).json({ error: "Not authorized" });
        
        const { studentId } = req.body;
        if (!studentId) return res.status(400).json({error: "studentId required"});
        await classService.addMember(req.params.id, studentId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

module.exports = router;
