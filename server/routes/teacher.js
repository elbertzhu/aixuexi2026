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

// Helper to Create Class (For testing/seeding mainly, but useful to have)
router.post('/class', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({error: "Class name required"});
        const newClass = await classService.createClass(req.user.id, name);
        res.json(newClass);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Helper to Add Student (For testing/seeding)
router.post('/class/:id/members', async (req, res) => {
    try {
        const { studentId } = req.body;
        if (!studentId) return res.status(400).json({error: "studentId required"});
        await classService.addMember(req.params.id, studentId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

module.exports = router;
