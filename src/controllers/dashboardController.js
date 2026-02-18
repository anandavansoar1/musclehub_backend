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

    const revenueResult = await Member.aggregate([
        { $match: { gymId } },
        { $group: { _id: null, totalRevenue: { $sum: '$price' } } }
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

// @desc    Send expiry reminders
// @route   POST /api/admin/send-expiry-reminders
// @access  Private/Admin
const sendExpiryReminders = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    if (!gymId) return res.status(404).json({ message: 'Gym not found' });

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

    let sentCount = 0;
    const failedNumbers = [];

    for (const member of expiringMembers) {
        try {
            const endDate = new Date(member.endDate);
            const diffTime = endDate.getTime() - today.getTime();
            const daysRemaining = Math.ceil(diffTime / (1000 * 3600 * 24));
            const message = `Hi ${member.fullName}, your membership expires in ${daysRemaining} day(s) on ${endDate.toLocaleDateString('en-IN')}. Please renew to continue.`;
            console.log(`SMS to ${member.phone}: ${message}`);
            sentCount++;
        } catch (error) {
            failedNumbers.push(member.phone);
        }
    }

    res.json({
        success: true,
        sentCount,
        totalMembers: expiringMembers.length,
        failedNumbers,
        message: `Reminders sent to ${sentCount} out of ${expiringMembers.length} members`
    });
});

module.exports = { getDashboardStats, getExpiringMembers, sendExpiryReminders };
