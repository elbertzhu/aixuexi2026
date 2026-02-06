const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../auth/middleware');
const classService = require('../services/class');

// v0.5.0: Rate Limiter (In-memory, simple per IP/UserId)
// Window: 1 minute, Max: 5 requests
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 min
const RATE_LIMIT_MAX = 5;

function checkRateLimit(key) {
    const now = Date.now();
    const record = rateLimitMap.get(key);
    
    if (!record || now - record.windowStart > RATE_LIMIT_WINDOW) {
        rateLimitMap.set(key, { windowStart: now, count: 1 });
        return true; // Allowed
    }
    
    if (record.count >= RATE_LIMIT_MAX) {
        return false; // Blocked
    }
    
    record.count++;
    return true;
}

// Apply Authentication
router.use(authenticate);

// Middleware: Student Only
router.use(requireRole('student'));

// v0.4.0 POST /api/student/join
// v0.5.0: Rate Limit + Usage Tracking
// v0.5.3: Added ip/ua to audit
router.post('/join', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: "Invite code required" });

        // v0.5.0: Rate Limit Check
        const rateKey = `${req.ip}:${req.user.id}`;
        if (!checkRateLimit(rateKey)) {
            // v0.5.3: Audit rate limit failure
            await classService.logAudit({
                actorId: req.user.id,
                actorRole: 'student',
                action: 'JOIN_CLASS',
                target: code,
                result: 'fail',
                reason: 'Rate limit exceeded',
                requestId: req.headers['x-request-id'] || null,
                ip: req.ip || req.connection?.remoteAddress || null,
                userAgent: req.headers['user-agent'] || null
            });
            return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
        }

        // 1. Verify Code
        const invite = await classService.verifyInvite(code);
        if (!invite) {
            // v0.5.3: Audit invalid code
            await classService.logAudit({
                actorId: req.user.id,
                actorRole: 'student',
                action: 'JOIN_CLASS',
                target: code,
                result: 'fail',
                reason: 'Invalid/expired/limit code',
                requestId: req.headers['x-request-id'] || null,
                ip: req.ip || req.connection?.remoteAddress || null,
                userAgent: req.headers['user-agent'] || null
            });
            return res.status(404).json({ error: "Invalid, expired, or usage-limited invite code" });
        }

        // 2. Add Member
        await classService.addMember(invite.class_id, req.user.id);

        // 3. Increment Usage
        await classService.incrementInviteUsage(code);

        // 4. Audit Log (success)
        await classService.logAudit({
            actorId: req.user.id,
            actorRole: 'student',
            action: 'JOIN_CLASS',
            target: `${invite.class_id}/${code}`,
            result: 'success',
            requestId: req.headers['x-request-id'] || null,
            ip: req.ip || req.connection?.remoteAddress || null,
            userAgent: req.headers['user-agent'] || null
        });

        res.json({ success: true, classId: invite.class_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// v0.4.0 POST /api/student/leave
// v0.5.3: Added ip/ua to audit
router.post('/leave', async (req, res) => {
    try {
        const { classId } = req.body;
        if (!classId) return res.status(400).json({ error: "classId required" });

        // Security limits: Can only remove self.
        await classService.removeMember(classId, req.user.id, req.user.id, 'student');
        
        // Audit
        await classService.logAudit({
            actorId: req.user.id,
            actorRole: 'student',
            action: 'LEAVE_CLASS',
            target: `${classId}`,
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

module.exports = router;
