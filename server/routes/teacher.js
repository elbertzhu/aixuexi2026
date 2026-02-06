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

        const invite = await classService.generateInvite(classId, req.user.id);
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
router.delete('/classes/:id/members/:studentId', async (req, res) => {
    try {
        const { id: classId, studentId } = req.params;
        const isOwner = await classService.isClassOwner(classId, req.user.id);
        if (!isOwner) return res.status(403).json({ error: "Not authorized for this class" });

        await classService.removeMember(classId, studentId);
        // Audit log could go here
        res.json({ success: true });
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
