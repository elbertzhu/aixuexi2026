const express = require('express');
const router = express.Router();
const authService = require('../auth/service');
const storage = require('../stats/storage');
const { authenticate, requireRole } = require('../auth/middleware');

router.use(authenticate);

// Parent Dashboard: Get My Children's Status
router.get('/dashboard/summary', requireRole('parent'), async (req, res) => {
    try {
        const students = await authService.getStudentsForParent(req.user.id);
        const srsService = require('../srs/service');
        const report = [];

        for (const student of students) {
            const profile = await storage.getProfile(student.id);
            const pending = await srsService.getPendingItems(student.id, 100);
            
            report.push({
                student: { id: student.id, name: student.name },
                profile: profile,
                srsCount: pending.length
            });
        }

        res.json({
            parent: req.user,
            children: report
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Seed Data (Helper)
router.post('/seed', async (req, res) => {
    try {
        await authService.createUser('parent_1', 'Parent Bob', 'parent');
        await authService.createUser('student_1', 'Alice', 'student');
        await authService.linkUsers('parent_1', 'student_1');
        res.json({ message: 'Seeded parent_1 -> student_1' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
