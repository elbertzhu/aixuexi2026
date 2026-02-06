const authService = require('./service');

// Mock Auth Middleware
// Expects header: x-user-id
function authenticate(req, res, next) {
    const userId = req.headers['x-user-id'];
    const role = req.headers['x-role'] || 'student';
    
    if (!userId) {
        req.user = { id: 'guest', role: 'student' };
        return next();
    }

    authService.getUser(userId).then(user => {
        if (!user) {
            // Auto-create for dev convenience
            return authService.createUser(userId, userId, role).then(newUser => {
                req.user = newUser;
                next();
            });
        }
        // If user exists but header says different role (for testing RBAC), 
        // prefer header if valid (simple mock logic)
        if (user.role !== role && ['teacher', 'student', 'parent'].includes(role)) {
             // Update role in memory for this request only? Or update DB?
             // For simplicity, let's just trust the Header for testing if it overrides.
             // But we need to ensure the middleware respects the override.
             // The issue is `authenticate` populates `req.user`.
             // If I want to test RBAC, I want to force `req.user.role = 'student'` even if DB says 'teacher'.
             req.user = { ...user, role: role };
        } else {
             req.user = user;
        }
        next();
    }).catch(err => {
        console.error('Auth Error', err);
        res.status(500).json({ error: 'Auth failed' });
    });
}

function requireRole(role) {
    return (req, res, next) => {
        if (req.user && req.user.role === role) {
            next();
        } else {
            res.status(403).json({ error: `Requires role: ${role}` });
        }
    };
}

module.exports = { authenticate, requireRole };
