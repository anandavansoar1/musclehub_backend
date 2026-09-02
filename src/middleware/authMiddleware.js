const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler'); // I need to install this or just use try/catch blocks. I'll stick to manual try-catch for simplicity or install it. I'll use async/await wrapper manually to avoid extra dep for now, or just handle it. Or I can install express-async-handler. It's cleaner.
const User = require('../models/User');

const protect = async (req, res, next) => {
    console.log(">>> PROTECT MIDDLEWARE HIT <<< URL:", req.originalUrl);
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
        try {
            
            console.log('RECEIVED TOKEN:', token);
            
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
            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'TEST_ERROR_123' });
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
