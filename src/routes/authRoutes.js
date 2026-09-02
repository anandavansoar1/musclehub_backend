const express = require('express');
const router = express.Router();
const User = require('../models/User');
const {
    loginUser,
    registerUser,
    getUserProfile,
    updateUserProfile,
    updateUserBySuperAdmin,
    superAdminLogin,
    superAdminUpdatePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);
router.route('/users/:id/admin').put(protect, updateUserBySuperAdmin);

// Super Admin Routes
router.post('/superadmin/login', superAdminLogin);
router.put('/superadmin/password', protect, superAdminUpdatePassword);

module.exports = router;
