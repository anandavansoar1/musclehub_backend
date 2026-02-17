const express = require('express');
const router = express.Router();
const {
    createNotification,
    getNotifications,
    markAsRead,
    deleteNotification
} = require('../controllers/notificationController');

const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, admin, createNotification)
    .get(protect, getNotifications);

router.route('/:id').delete(protect, admin, deleteNotification);

// User focused route
router.route('/:id/read').put(protect, markAsRead);

module.exports = router;
