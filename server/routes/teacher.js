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

// v0.4.0 POST /api/teacher/classes
// Create a new class
router.post('/classes', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({error: "Class name required"});
        const newClass = await classService.createClass(req.user.id, name);
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
// v0.5.0: Added Audit Log
router.delete('/classes/:id/members/:studentId', async (req, res) => {
    try {
        const { id: classId, studentId } = req.params;
        const isOwner = await classService.isClassOwner(classId, req.user.id);
        if (!isOwner) return res.status(403).json({ error: "Not authorized for this class" });

        await classService.removeMember(classId, studentId, req.user.id, 'teacher');
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

// v0.5.2 GET /api/teacher/audit/export
// Export audit logs as CSV
router.get('/audit/export', async (req, res) => {
    try {
        const { classId, action, actor_role, from, to, order } = req.query;
        
        const result = await classService.getAuditLogs({ 
            classId, 
            action, 
            actorRole: actor_role,
            from, 
            to,
            limit: 10000, // Max export
            offset: 0,
            order: order || 'desc'
        });
        
        // Generate CSV
        const headers = ['time', 'actor_id', 'actor_role', 'action', 'target', 'result'];
        let csv = headers.join(',') + '\n';
        
        result.items.forEach(row => {
            const time = new Date(row.timestamp).toISOString();
            csv += `"${time}","${row.actor_id}","${row.actor_role}","${row.action}","${row.target}","${row.result}"\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.csv');
        res.send(csv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


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
