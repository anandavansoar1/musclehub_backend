const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');

// @desc    Create a new notification
// @route   POST /api/notifications
// @access  Private/Admin
const createNotification = asyncHandler(async (req, res) => {
    const { title, message, type, targetAudience } = req.body;

    const notification = await Notification.create({
        title,
        message,
        type,
        targetAudience,
        createdBy: req.user._id,
    });

    if (notification) {
        res.status(201).json(notification);
    } else {
        res.status(400);
        throw new Error('Invalid notification data');
    }
});

// @desc    Get all notifications (Admin: all, User: targeted + global)
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
    // For now, fetch all. Later prioritize by targetAudience.
    const notifications = await Notification.find({}).sort({ createdAt: -1 });

    // Add 'isRead' flag for the requesting user
    const notificationsWithStatus = notifications.map(notif => {
        const isRead = notif.readBy.includes(req.user._id);
        // Exclude the heavy 'readBy' array from response to reduce payload if needed
        const { readBy, ...rest } = notif.toObject();
        return { ...rest, isRead };
    });

    res.json(notificationsWithStatus);
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);

    if (notification) {
        if (!notification.readBy.includes(req.user._id)) {
            notification.readBy.push(req.user._id);
            await notification.save();
        }
        res.json({ message: 'Notification marked as read' });
    } else {
        res.status(404);
        throw new Error('Notification not found');
    }
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private/Admin
const deleteNotification = asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);

    if (notification) {
        await notification.deleteOne();
        res.json({ message: 'Notification removed' });
    } else {
        res.status(404);
        throw new Error('Notification not found');
    }
});

module.exports = {
    createNotification,
    getNotifications,
    markAsRead,
    deleteNotification
};
