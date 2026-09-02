const express = require('express');
const router = express.Router();
const { getPlatformSettings, updatePlatformSettings, updateGymCustomPlans } = require('../controllers/platformSettingsController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getPlatformSettings)
    .put(protect, admin, updatePlatformSettings);

router.put('/gym/:gymId/custom-plans', protect, admin, updateGymCustomPlans);

module.exports = router;
