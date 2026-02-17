const asyncHandler = require('express-async-handler');
const Member = require('../models/Member');
const User = require('../models/User');
const Attendance = require('../models/Attendance');

// @desc    Get dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
    // 1. Active Members Count
    const activeMembers = await Member.countDocuments({ status: 'Active' });

    // 2. Members Expiring Soon (Next 7 Days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // For queries involving today
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const expiringMembersCount = await Member.countDocuments({
        endDate: { $lte: nextWeek, $gte: today },
        status: 'Active'
    });

    // 3. Revenue (Sum of 'price' field from all members)
    const revenueResult = await Member.aggregate([
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: "$price" }
            }
        }
    ]);
    const revenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // 4. Real Attendance Calculations

    // Live Occupancy: Check-ins today that haven't checked out yet
    const currentOccupancy = await Attendance.countDocuments({
        date: { $gte: today, $lt: tomorrow },
        checkOutTime: { $exists: false }
        // Note: checking for null often requires $eq: null or $exists: false depending on schema defaults.
        // Since schema says default is Date.now for checkIn, checkOut is optional.
        // Let's assume unchecked-out means checkOutTime is null or undefined.
    });

    // Daily Attendance Percentage: (Unique check-ins today / Total Active Members) * 100
    // First, count unique members who checked in today
    const distinctCheckIns = await Attendance.distinct('member', {
        date: { $gte: today, $lt: tomorrow }
    });

    const todaysCheckInCount = distinctCheckIns.length;

    // Avoid division by zero
    const attendancePercentage = activeMembers > 0
        ? Math.round((todaysCheckInCount / activeMembers) * 100)
        : 0;

    // Live Occupancy Percentage (Current / Capacity)
    const MAX_CAPACITY = 200; // This could be a setting in the future
    const occupancyPercentage = Math.min(100, Math.round((currentOccupancy / MAX_CAPACITY) * 100));

    // Get Admin Name from logged in user
    const adminName = req.user ? req.user.name : 'Admin';

    res.json({
        name: adminName,
        activeMembers,
        expiringMembers: expiringMembersCount,
        revenue,
        attendance: attendancePercentage,
        liveOccupancy: currentOccupancy,
        occupancyPercentage
    });
});

// @desc    Get expiring members with customizable threshold
// @route   GET /api/admin/expiring-members?days=7
// @access  Private/Admin
const getExpiringMembers = asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days) || 7;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);
    futureDate.setHours(23, 59, 59, 999);

    const expiringMembers = await Member.find({
        endDate: { $gte: today, $lte: futureDate },
        status: 'Active'
    }).sort({ endDate: 1 });

    // Calculate days remaining for each member
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

    res.json({
        members: membersWithDays,
        count: membersWithDays.length,
        threshold: days
    });
});

// @desc    Send expiry reminders to members
// @route   POST /api/admin/send-expiry-reminders
// @access  Private/Admin
const sendExpiryReminders = asyncHandler(async (req, res) => {
    const { days } = req.body;
    const threshold = parseInt(days) || 7;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date();
    futureDate.setDate(today.getDate() + threshold);
    futureDate.setHours(23, 59, 59, 999);

    const expiringMembers = await Member.find({
        endDate: { $gte: today, $lte: futureDate },
        status: 'Active'
    });

    // SMS sending logic (integrate with Twilio, MSG91, or other SMS service)
    let sentCount = 0;
    const failedNumbers = [];

    for (const member of expiringMembers) {
        try {
            const endDate = new Date(member.endDate);
            const diffTime = endDate.getTime() - today.getTime();
            const daysRemaining = Math.ceil(diffTime / (1000 * 3600 * 24));

            // SMS message template
            const message = `Hi ${member.fullName}, your membership at MuscleHub expires in ${daysRemaining} day(s) on ${endDate.toLocaleDateString('en-IN')}. Please renew to continue enjoying our services. Contact us for assistance.`;

            // TODO: Integrate with actual SMS service
            // Example with Twilio:
            // await twilioClient.messages.create({
            //     body: message,
            //     from: process.env.TWILIO_PHONE_NUMBER,
            //     to: member.phone
            // });

            // For now, just log the message (mock SMS)
            console.log(`SMS to ${member.phone}: ${message}`);
            sentCount++;

        } catch (error) {
            console.error(`Failed to send SMS to ${member.phone}:`, error);
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

module.exports = {
    getDashboardStats,
    getExpiringMembers,
    sendExpiryReminders
};
