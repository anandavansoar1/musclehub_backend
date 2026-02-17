const express = require('express');
const router = express.Router();
const { generateCheckInToken, checkIn, getHistory, manualCheckIn, checkOut } = require('../controllers/attendanceController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/token', protect, admin, generateCheckInToken);
router.post('/checkin', protect, checkIn);
router.post('/checkout', protect, checkOut);
router.post('/manual-checkin', protect, admin, manualCheckIn);
router.get('/history', protect, getHistory);

module.exports = router;
