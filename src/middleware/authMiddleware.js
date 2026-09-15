const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Gym = require('../models/Gym');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
        try {
            // Check if it's the real super admin token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            if (decoded.id === 'SUPERADMIN') {
                req.user = { _id: 'SUPERADMIN', role: 'admin', isAdmin: true, isSuperAdmin: true };
                return next();
            }

            req.user = await User.findById(decoded.id).select('-password');
            
            if (!req.user) {
                return res.status(401).json({ message: 'User not found' });
            }

            // Super Admin Bypass - Super Admin is never blocked
            if (req.user.isSuperAdmin || (req.user.isAdmin && (req.user.role === 'superadmin' || decoded.id === 'SUPERADMIN'))) {
                return next();
            }

            // Routes that are allowed even if subscription is expired (so gym owner can see subscription status or make platform payments)
            const isExemptRoute = 
                req.originalUrl.includes('/api/auth') || 
                req.originalUrl.includes('/api/platform-payments') ||
                req.originalUrl.includes('/api/platform-settings') ||
                (req.originalUrl.includes('/api/gym') && (req.method === 'GET' || req.originalUrl.includes('/subscription')));

            if (!isExemptRoute) {
                let gym = null;

                if (req.user.role === 'admin') {
                    gym = await Gym.findOne({ owner: req.user._id });
                } else if (req.user.gymId) {
                    gym = await Gym.findById(req.user.gymId);
                }

                if (gym) {
                    const isExpired = gym.subscriptionEndDate && new Date(gym.subscriptionEndDate) < new Date();
                    const isManuallyInactive = gym.isActive === false;

                    if (isExpired || isManuallyInactive) {
                        return res.status(403).json({
                            isLocked: true,
                            message: 'Gym access is locked due to pending subscription payment. Please contact administrator to renew.'
                        });
                    }
                }
            }

            next();
        } catch (error) {
            console.error('Auth protect error:', error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, admin };

