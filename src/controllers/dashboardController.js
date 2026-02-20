const asyncHandler = require('express-async-handler');
const Member = require('../models/Member');
const Attendance = require('../models/Attendance');
const { getGymIdForAdmin } = require('./gymController');

// @desc    Get dashboard stats for the logged-in gym
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    if (!gymId) return res.status(404).json({ message: 'Gym not found. Please set up your gym profile.' });

    const activeMembers = await Member.countDocuments({ gymId, status: 'Active' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const expiringMembersCount = await Member.countDocuments({
        gymId,
        endDate: { $lte: nextWeek, $gte: today },
        status: 'Active'
    });

    const Payment = require('../models/Payment');
    const revenueResult = await Payment.aggregate([
        { $match: { gymId, type: 'Membership', status: 'Paid' } },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
    ]);
    const revenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // Get all member IDs for this gym for attendance scoping
    const gymMemberIds = await Member.find({ gymId }).distinct('_id');

    const currentOccupancy = await Attendance.countDocuments({
        member: { $in: gymMemberIds },
        date: { $gte: today, $lt: tomorrow },
        checkOutTime: { $exists: false }
    });

    const distinctCheckIns = await Attendance.distinct('member', {
        member: { $in: gymMemberIds },
        date: { $gte: today, $lt: tomorrow }
    });

    const attendancePercentage = activeMembers > 0
        ? Math.round((distinctCheckIns.length / activeMembers) * 100)
        : 0;

    const Gym = require('../models/Gym');
    const gym = await Gym.findById(gymId);
    const MAX_CAPACITY = gym ? gym.maxCapacity : 200;
    const occupancyPercentage = Math.min(100, Math.round((currentOccupancy / MAX_CAPACITY) * 100));

    res.json({
        name: req.user.name,
        gymName: gym ? gym.name : req.user.name,
        activeMembers,
        expiringMembers: expiringMembersCount,
        revenue,
        attendance: attendancePercentage,
        liveOccupancy: currentOccupancy,
        occupancyPercentage
    });
});

// @desc    Get expiring members for this gym
// @route   GET /api/admin/expiring-members?days=7
// @access  Private/Admin
const getExpiringMembers = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    if (!gymId) return res.status(404).json({ message: 'Gym not found' });

    const days = parseInt(req.query.days) || 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);
    futureDate.setHours(23, 59, 59, 999);

    const expiringMembers = await Member.find({
        gymId,
        endDate: { $gte: today, $lte: futureDate },
        status: 'Active'
    }).sort({ endDate: 1 });

    const membersWithDays = expiringMembers.map(member => {
        const endDate = new Date(member.endDate);
        const diffTime = endDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 3600 * 24));
        return {
            id: member._id,
            name: member.fullName,
            phone: member.phone,
            plan: member.membershipType,
            endDate: member.endDate,
            daysRemaining: Math.max(0, daysRemaining)
        };
    });

    res.json({ members: membersWithDays, count: membersWithDays.length, threshold: days });
});

// @desc    Send expiry reminders — in-app notification + SMS per member
// @route   POST /api/admin/send-expiry-reminders
// @access  Private/Admin
const sendExpiryReminders = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    if (!gymId) return res.status(404).json({ message: 'Gym not found' });

    const Notification = require('../models/Notification');
    const User = require('../models/User');
    const { sendSms } = require('../services/smsService');
    const Gym = require('../models/Gym');

    const { days } = req.body;
    const threshold = parseInt(days) || 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + threshold);
    futureDate.setHours(23, 59, 59, 999);

    const expiringMembers = await Member.find({
        gymId,
        endDate: { $gte: today, $lte: futureDate },
        status: 'Active'
    });

    // Fetch gym name for personalised messages
    const gym = await Gym.findById(gymId);
    const gymName = gym ? gym.name : 'Your Gym';

    let notifCount = 0;
    let smsCount = 0;
    const smsResults = [];

    for (const member of expiringMembers) {
        const endDate = new Date(member.endDate);
        const diffTime = endDate.getTime() - today.getTime();
        const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 3600 * 24)));
        const formattedDate = endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

        const notifTitle = `⏰ Membership Expiring ${daysRemaining === 0 ? 'Today' : `in ${daysRemaining} Day${daysRemaining > 1 ? 's' : ''}`}`;
        const notifMessage = `Hi ${member.fullName}! Your ${member.membershipType} membership at ${gymName} expires on ${formattedDate}. Please renew to keep your access active. 💪`;
        const smsBody = `Hi ${member.fullName}, your membership at ${gymName} expires in ${daysRemaining} day(s) on ${formattedDate}. Please renew soon. - ${gymName}`;

        // ── 1. In-app notification targeted to this member's user account ──
        try {
            // Find the linked user account for this member
            let targetUserId = member.userId || null;
            let targetUserToken = null;

            if (!targetUserId) {
                const linkedUser = await User.findOne({ linkedMemberId: member._id });
                if (linkedUser) {
                    targetUserId = linkedUser._id;
                    targetUserToken = linkedUser.fcmToken;
                }
            } else {
                const user = await User.findById(targetUserId).select('fcmToken');
                if (user) targetUserToken = user.fcmToken;
            }

            const newNotif = await Notification.create({
                gymId,
                title: notifTitle,
                message: notifMessage,
                type: 'Alert',
                targetAudience: 'Members',
                targetUserId: targetUserId || null,
                createdBy: req.user._id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // expires in 7 days
            });
            notifCount++;

            // ── 1.5 Send Push Notification if user has token ──
            if (targetUserToken) {
                const { sendPushNotification } = require('../services/firebaseService');
                await sendPushNotification(targetUserToken, notifTitle, notifMessage, {
                    type: 'Alert',
                    notificationId: newNotif._id.toString()
                });
            }
        } catch (err) {
            console.error(`Failed to create notification for ${member.fullName}:`, err.message);
        }

        // ── 2. SMS (future-proof — currently logs to console) ──
        if (member.phone) {
            try {
                const result = await sendSms(member.phone, smsBody);
                if (result.success) smsCount++;
                smsResults.push({ name: member.fullName, phone: member.phone, ...result });
            } catch (err) {
                smsResults.push({ name: member.fullName, phone: member.phone, success: false, error: err.message });
            }
        }
    }

    res.json({
        success: true,
        sentCount: notifCount,          // in-app notifications created
        smsCount,                        // SMS sent (0 in console mode)
        totalMembers: expiringMembers.length,
        smsProvider: process.env.SMS_PROVIDER || 'console',
        smsResults,
        message: `Reminders sent to ${notifCount} member(s) via in-app notification. SMS: ${smsCount}/${expiringMembers.length} (provider: ${process.env.SMS_PROVIDER || 'console'}).`
    });
});

module.exports = { getDashboardStats, getExpiringMembers, sendExpiryReminders };
