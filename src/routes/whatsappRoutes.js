const express = require('express');
const router = express.Router();
const {
    getStatus,
    getPairingCode,
    getQR,
    logout,
    broadcastReminders,
} = require('../controllers/whatsappController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/status', protect, admin, getStatus);
router.post('/pairing-code', protect, admin, getPairingCode);
router.get('/qr', protect, admin, getQR);
router.post('/logout', protect, admin, logout);
router.post('/broadcast-reminders', protect, admin, broadcastReminders);

module.exports = router;
