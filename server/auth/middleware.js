const authService = require('./service');

// Mock Auth Middleware
// Expects header: x-user-id
function authenticate(req, res, next) {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        req.user = { id: 'guest', role: 'student' }; // Default
        return next();
    }

    authService.getUser(userId).then(user => {
        if (!user) {
            // Auto-create for dev convenience if not exists?
            // For v0.2.0, let's auto-create 'student' if unknown to keep v0.1.0 compat
            return authService.createUser(userId, userId, 'student').then(newUser => {
                req.user = newUser;
                next();
            });
        }
        req.user = user;
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
