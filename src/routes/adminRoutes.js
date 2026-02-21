const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { getDashboardStats, getExpiringMembers, sendExpiryReminders, getReportsData } = require('../controllers/dashboardController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, admin, getDashboardStats);
router.get('/expiring-members', protect, admin, getExpiringMembers);
router.post('/send-expiry-reminders', protect, admin, sendExpiryReminders);
router.get('/reports', protect, admin, getReportsData);

// Toggle premium access for a specific user
router.put('/toggle-premium/:userId', protect, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (user) {
            user.premiumFeatureAccess = !user.premiumFeatureAccess;
            await user.save();
            res.json({ message: `Premium access ${user.premiumFeatureAccess ? 'enabled' : 'disabled'} for ${user.name}` });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
