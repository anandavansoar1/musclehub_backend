const express = require('express');
const router = express.Router();
const User = require('../models/User');
const {
    loginUser,
    registerUser,
    getUserProfile,
    updateUserProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);

// Simulate successful payment/upgrade
router.put('/upgrade', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            user.premiumFeatureAccess = true;
            await user.save();
            res.json({
                success: true,
                message: 'Your account has been upgraded to PREMIUM!',
                premiumFeatureAccess: true
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
