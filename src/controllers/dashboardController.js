const asyncHandler = require('express-async-handler');
const Member = require('../models/Member');
const Attendance = require('../models/Attendance');
const mongoose = require('mongoose');
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

    const WorkoutClass = require('../models/WorkoutClass');
    const upcomingClasses = await WorkoutClass.find({ gymId, date: { $gte: today } })
        .sort({ date: 1, timeString: 1 })
        .limit(3);

    const Notification = require('../models/Notification');
    const recentAlerts = await Notification.find({ gymId, type: 'Alert' })
        .sort({ createdAt: -1 })
        .limit(3);

    // Get Top 3 performers (Leaderboard) for Admin Dashboard
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const topPerformers = await Attendance.aggregate([
        {
            $match: {
                gymId: new mongoose.Types.ObjectId(gymId),
                date: { $gte: thirtyDaysAgo }
            }
        },
        {
            $group: {
                _id: "$member",
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 3 },
        {
            $lookup: {
                from: "members",
                localField: "_id",
                foreignField: "_id",
                as: "memberInfo"
            }
        },
        { $unwind: "$memberInfo" },
        {
            $project: {
                name: "$memberInfo.name",
                count: 1
            }
        }
    ]);

    res.json({
        name: req.user.name,
        gymName: gym ? gym.name : req.user.name,
        activeMembers,
        expiringMembers: expiringMembersCount,
        revenue,
        attendance: attendancePercentage,
        liveOccupancy: currentOccupancy,
        occupancyPercentage,
        upcomingClasses,
        recentAlerts,
        topPerformers
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

// @desc    Get reports data for the logged-in gym
// @route   GET /api/admin/reports
// @access  Private/Admin
const getReportsData = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    if (!gymId) return res.status(404).json({ message: 'Gym not found' });

    const period = req.query.period || 'Month'; // 'Week', 'Month', 'Year'
    const now = new Date();
    let startDate = new Date();

    if (period === 'Week') {
        startDate.setDate(now.getDate() - 7);
    } else if (period === 'Year') {
        startDate.setFullYear(now.getFullYear() - 1);
    } else {
        // Default to last 30 days
        startDate.setDate(now.getDate() - 30);
    }

    const Payment = require('../models/Payment');

    // 1. Total Revenue in period
    const revenueResult = await Payment.aggregate([
        { $match: { gymId, type: 'Membership', status: 'Paid', createdAt: { $gte: startDate } } },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // 2. Active Conversions (New Members in period)
    const newMembersCount = await Member.countDocuments({
        gymId,
        createdAt: { $gte: startDate }
    });

    // 3. Dropout Rate (Members who expired in period and didn't renew) - simple proxy
    const droppedMembersCount = await Member.countDocuments({
        gymId,
        endDate: { $gte: startDate, $lt: now },
        status: { $ne: 'Active' }
    });

    const activeMembersCount = await Member.countDocuments({ gymId, status: 'Active' });
    const dropoutRate = activeMembersCount > 0
        ? ((droppedMembersCount / (activeMembersCount + droppedMembersCount)) * 100).toFixed(1)
        : 0;

    // 4. Revenue Trend (last 6 months basically, grouped by month)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const trendResult = await Payment.aggregate([
        { $match: { gymId, type: 'Membership', status: 'Paid', createdAt: { $gte: sixMonthsAgo } } },
        {
            $group: {
                _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
                total: { $sum: '$amount' }
            }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let revenueTrend = [];

    // Fill empty months if needed
    for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        const match = trendResult.find(t => t._id.month === d.getMonth() + 1 && t._id.year === d.getFullYear());
        revenueTrend.push({
            label: monthNames[d.getMonth()],
            value: match ? match.total : 0
        });
    }

    // 5. Attendance (Last 7 days)
    const last7Days = new Date();
    last7Days.setDate(now.getDate() - 6);
    last7Days.setHours(0, 0, 0, 0);

    const gymMemberIds = await Member.find({ gymId }).distinct('_id');
    const attendanceResult = await Attendance.aggregate([
        { $match: { member: { $in: gymMemberIds }, date: { $gte: last7Days } } },
        {
            $group: {
                _id: { $dayOfWeek: "$date" }, // 1 (Sun) - 7 (Sat)
                count: { $sum: 1 }
            }
        }
    ]);

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    let attendanceTrend = [];
    // Last 7 days in order
    for (let i = 0; i < 7; i++) {
        const d = new Date(last7Days.getTime());
        d.setDate(d.getDate() + i);
        const dayOfWeekIndex = d.getDay() + 1; // getDay is 0 (Sun), mongo is 1 (Sun)
        const match = attendanceResult.find(a => a._id === dayOfWeekIndex);

        // Calculate percentage assuming avg members active this week is `activeMembersCount`
        let percent = 0;
        if (activeMembersCount > 0) {
            percent = match ? Math.min(100, Math.round((match.count / activeMembersCount) * 100)) : 0;
        }

        attendanceTrend.push({
            label: dayNames[d.getDay()],
            value: percent,
            color: '#38BDF8'
        });
    }

    // 6. Top Membership Plans (overall currently active)
    const planResult = await Member.aggregate([
        { $match: { gymId, status: 'Active' } },
        {
            $group: {
                _id: "$membershipType",
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 3 }
    ]);

    const colors = ['#E11D48', '#FACC15', '#38BDF8'];
    const totalActiveBase = Math.max(activeMembersCount, 1);

    const topPlans = planResult.map((p, index) => ({
        name: p._id || 'Standard',
        count: p.count,
        percent: `${Math.round((p.count / totalActiveBase) * 100)}%`,
        color: colors[index % colors.length]
    }));

    res.json({
        totalRevenue,
        activeConversions: newMembersCount,
        dropoutRate: dropoutRate,
        revenueTrend,
        attendanceTrend,
        topPlans
    });
});

module.exports = { getDashboardStats, getExpiringMembers, sendExpiryReminders, getReportsData };
