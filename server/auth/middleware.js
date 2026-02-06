const authService = require('./service');

// Mock Auth Middleware
// Expects header: x-user-id, x-role (optional)
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
            // Allow creating admin if header specifies it
            const effectiveRole = ['admin', 'teacher', 'student', 'parent'].includes(role) ? role : 'student';
            return authService.createUser(userId, userId, effectiveRole).then(newUser => {
                req.user = newUser;
                next();
            });
        }
        // Allow role override via header for testing RBAC
        if (['admin', 'teacher', 'student', 'parent'].includes(role)) {
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
