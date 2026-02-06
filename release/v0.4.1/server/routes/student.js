const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../auth/middleware');
const classService = require('../services/class');

// Apply Authentication
router.use(authenticate);

// Middleware: Student Only
router.use(requireRole('student'));

// POST /api/student/join
// Join a class using an invite code
router.post('/join', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: "Invite code required" });

        // 1. Verify Code
        const invite = await classService.verifyInvite(code);
        if (!invite) return res.status(404).json({ error: "Invalid or expired invite code" });

        // 2. Add Member
        await classService.addMember(invite.class_id, req.user.id);

        res.json({ success: true, classId: invite.class_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/student/leave
// Leave a class
router.post('/leave', async (req, res) => {
    try {
        const { classId } = req.body;
        if (!classId) return res.status(400).json({ error: "classId required" });

        // Security limits: Can only remove self.
        // removeMember logic in service handles DB delete.
        await classService.removeMember(classId, req.user.id);
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
