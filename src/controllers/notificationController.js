const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');
const { getGymIdForAdmin } = require('./gymController');

// @desc    Create a new notification for this gym
// @route   POST /api/notifications
// @access  Private/Admin
const createNotification = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    if (!gymId) return res.status(404).json({ message: 'Gym not found' });

    const { title, message, type, targetAudience, expiresAt } = req.body;

    const notification = await Notification.create({
        gymId,
        title,
        message,
        type,
        targetAudience,
        expiresAt: expiresAt || null,
        createdBy: req.user._id,
    });

    if (notification) {
        res.status(201).json(notification);
    } else {
        res.status(400);
        throw new Error('Invalid notification data');
    }
});

// @desc    Get notifications for the logged-in user/admin
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
    let gymId = null;
    let memberJoinedAt = null; // When the member joined — don't show older notifications

    if (req.user.role === 'admin') {
        // Admin: fetch their own gym's notifications (all, including expired)
        gymId = await getGymIdForAdmin(req.user._id);

        if (!gymId) return res.json([]);

        const notifications = await Notification.find({ gymId }).sort({ createdAt: -1 });

        const notificationsWithStatus = notifications.map(notif => {
            const isRead = notif.readBy.some(id => id.toString() === req.user._id.toString());
            const isExpired = notif.expiresAt && new Date(notif.expiresAt) < new Date();
            const { readBy, ...rest } = notif.toObject();
            return { ...rest, isRead, isExpired };
        });

        return res.json(notificationsWithStatus);
    }

    // Member user: find their gym via their linked member record
    const Member = require('../models/Member');
    const memberRecord = req.user.linkedMemberId
        ? await Member.findById(req.user.linkedMemberId)
        : await Member.findOne({ userId: req.user._id });

    if (!memberRecord) return res.json([]);

    gymId = memberRecord.gymId;
    memberJoinedAt = memberRecord.createdAt; // Only show notifications AFTER they joined

    const now = new Date();

    // Build query:
    // 1. Must belong to this gym
    // 2. Must NOT be expired (expiresAt is null OR expiresAt > now)
    // 3. Must have been created AFTER the member joined (so new users don't see old announcements)
    const query = {
        gymId,
        $or: [
            { expiresAt: null },
            { expiresAt: { $gt: now } }
        ],
        createdAt: { $gte: memberJoinedAt }
    };

    const notifications = await Notification.find(query).sort({ createdAt: -1 });

    const notificationsWithStatus = notifications.map(notif => {
        const isRead = notif.readBy.some(id => id.toString() === req.user._id.toString());
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
        const alreadyRead = notification.readBy.some(id => id.toString() === req.user._id.toString());
        if (!alreadyRead) {
            notification.readBy.push(req.user._id);
            await notification.save();
        }
        res.json({ message: 'Notification marked as read' });
    } else {
        res.status(404);
        throw new Error('Notification not found');
    }
});

// @desc    Delete notification (only if it belongs to this gym)
// @route   DELETE /api/notifications/:id
// @access  Private/Admin
const deleteNotification = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    const notification = await Notification.findOne({ _id: req.params.id, gymId });

    if (notification) {
        await notification.deleteOne();
        res.json({ message: 'Notification removed' });
    } else {
        res.status(404);
        throw new Error('Notification not found');
    }
});

module.exports = { createNotification, getNotifications, markAsRead, deleteNotification };
