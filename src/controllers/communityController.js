const asyncHandler = require('express-async-handler');
const Member = require('../models/Member');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const mongoose = require('mongoose');

// @desc    Get Gym Leaderboard (Top 10 members by attendance last 30 days)
// @route   GET /api/community/leaderboard
// @access  Private
const getLeaderboard = asyncHandler(async (req, res) => {
    const gymId = req.user.role === 'admin' ? req.user._id : req.user.gymId;

    if (!gymId) {
        res.status(400);
        throw new Error('Gym ID not found');
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Aggregate attendance counts per member in the last 30 days
    const leaderboardData = await Attendance.aggregate([
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
        {
            $sort: { count: -1 }
        },
        {
            $limit: 10
        },
        {
            $lookup: {
                from: "members",
                localField: "_id",
                foreignField: "_id",
                as: "memberInfo"
            }
        },
        {
            $unwind: "$memberInfo"
        },
        {
            $project: {
                _id: 1,
                count: 1,
                name: "$memberInfo.name",
                avatar: "$memberInfo.avatar", // if exists
                plan: "$memberInfo.plan"
            }
        }
    ]);

    res.json(leaderboardData);
});

// @desc    Get Community Posts/Announcements
// @route   GET /api/community/posts
// @access  Private
const getCommunityPosts = asyncHandler(async (req, res) => {
    const gymId = req.user.role === 'admin' ? req.user._id : req.user.gymId;

    // For now, we use Announcements as posts
    const Notification = require('../models/Notification');
    const posts = await Notification.find({
        gymId: gymId,
        targetAudience: 'All',
        $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
        ]
    }).sort({ createdAt: -1 }).limit(20);

    res.json(posts);
});

// @desc    Get User Badges
// @route   GET /api/community/badges
// @access  Private
const getMyBadges = asyncHandler(async (req, res) => {
    // Dynamic badges based on attendance
    if (req.user.role === 'admin') {
        return res.json([]);
    }

    const memberId = req.user.linkedMemberId;
    if (!memberId) {
        return res.json([]);
    }

    const attendanceCount = await Attendance.countDocuments({ member: memberId });

    // Check for streaks
    const attendances = await Attendance.find({ member: memberId }).sort({ date: -1 });
    let streak = 0;
    if (attendances.length > 0) {
        let current = new Date();
        current.setHours(0, 0, 0, 0);

        for (let i = 0; i < attendances.length; i++) {
            let attDate = new Date(attendances[i].date);
            attDate.setHours(0, 0, 0, 0);

            // Check if it's the same day or one day before
            const diff = (current - attDate) / (1000 * 60 * 60 * 24);
            if (diff <= 1) {
                streak++;
                current = attDate;
            } else {
                break;
            }
        }
    }

    const badges = [];
    if (attendanceCount >= 1) badges.push({ id: 'first_day', name: 'Rookie', icon: 'award', color: '#38BDF8', description: 'Completed your first workout!' });
    if (attendanceCount >= 10) badges.push({ id: 'ten_days', name: 'Iron Core', icon: 'shield', color: '#A855F7', description: '10 workouts completed' });
    if (attendanceCount >= 30) badges.push({ id: 'thirty_days', name: 'Gym Rat', icon: 'target', color: '#10B981', description: '30 workouts completed' });
    if (streak >= 7) badges.push({ id: 'week_streak', name: 'Unstoppable', icon: 'zap', color: '#FACC15', description: '7-day workout streak!' });

    res.json({ badges, streak, totalWorkouts: attendanceCount });
});

module.exports = {
    getLeaderboard,
    getCommunityPosts,
    getMyBadges
};
