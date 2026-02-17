const Attendance = require('../models/Attendance');
const Member = require('../models/Member');
const jwt = require('jsonwebtoken');

// @desc    Generate a short-lived QR token for check-in
// @route   GET /api/attendance/token
// @access  Admin
const generateCheckInToken = async (req, res) => {
    try {
        // Token valid for 60 seconds
        const token = jwt.sign(
            { type: 'checkin_session', timestamp: Date.now() },
            process.env.JWT_SECRET,
            { expiresIn: '60s' }
        );
        res.json({ token });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check in a user using a QR token
// @route   POST /api/attendance/checkin
// @access  Private (User)
const checkIn = async (req, res) => {
    const { token } = req.body;

    try {
        // Verify QR Token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.type !== 'checkin_session') {
                throw new Error('Invalid token type');
            }
        } catch (err) {
            return res.status(400).json({ message: 'Invalid or expired QR code' });
        }

        // Check if user has a linked member profile
        if (!req.user.linkedMemberId) {
            return res.status(400).json({ message: 'No active membership found' });
        }

        const member = await Member.findById(req.user.linkedMemberId);
        if (!member) {
            return res.status(404).json({ message: 'Member profile not found' });
        }

        if (member.status !== 'active') {
            return res.status(400).json({ message: 'Membership is not active' });
        }

        // Check if already checked in today? (Optional, but good practice)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const existingCheckIn = await Attendance.findOne({
            member: member._id,
            checkInTime: { $gte: startOfDay }
        });

        if (existingCheckIn) {
            return res.status(400).json({ message: 'You have already checked in today!' });
        }

        const attendance = await Attendance.create({
            user: req.user._id,
            member: member._id,
            date: new Date(),
            method: 'qr'
        });

        res.status(201).json({
            success: true,
            message: 'Check-in successful!',
            data: attendance
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Old getHistory removed - replaced with enhanced version below

// @desc    Manual check-in by admin (no QR required)
// @route   POST /api/attendance/manual-checkin
// @access  Admin
const manualCheckIn = async (req, res) => {
    const { memberId } = req.body;

    try {
        if (!memberId) {
            return res.status(400).json({ message: 'Member ID is required' });
        }

        const member = await Member.findById(memberId);
        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }

        if (member.status !== 'Active') {
            return res.status(400).json({ message: `Membership is ${member.status}. Cannot check in.` });
        }

        // Check if already checked in today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const existingCheckIn = await Attendance.findOne({
            member: member._id,
            checkInTime: { $gte: startOfDay }
        });

        if (existingCheckIn) {
            return res.status(400).json({ message: 'Member has already checked in today!' });
        }

        const attendance = await Attendance.create({
            user: member.userId, // Link to user if exists
            member: member._id,
            date: new Date(),
            method: 'manual'
        });

        res.status(201).json({
            success: true,
            message: 'Manual check-in successful!',
            data: attendance
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check out a user
// @route   POST /api/attendance/checkout
// @access  Private
const checkOut = async (req, res) => {
    try {
        if (!req.user.linkedMemberId) {
            return res.status(400).json({ message: 'No active membership found' });
        }

        // Find today's check-in
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            member: req.user.linkedMemberId,
            checkInTime: { $gte: startOfDay },
            checkOutTime: null // Not yet checked out
        });

        if (!attendance) {
            return res.status(404).json({ message: 'No active check-in found for today' });
        }

        const checkOutTime = new Date();
        const durationMinutes = Math.round((checkOutTime - attendance.checkInTime) / (1000 * 60));

        attendance.checkOutTime = checkOutTime;
        attendance.duration = durationMinutes;
        await attendance.save();

        res.json({
            success: true,
            message: 'Check-out successful!',
            duration: durationMinutes,
            data: attendance
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get attendance history with stats for the logged-in user
// @route   GET /api/attendance/history
// @access  Private
const getHistory = async (req, res) => {
    try {
        if (!req.user.linkedMemberId) {
            return res.status(400).json({ message: 'No active membership found' });
        }

        const history = await Attendance.find({ member: req.user.linkedMemberId })
            .sort({ checkInTime: -1 });

        // Calculate stats
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

        // This month's attendance
        const thisMonthAttendance = history.filter(a =>
            new Date(a.checkInTime) >= startOfMonth
        );

        // Calculate streak (consecutive days)
        let streak = 0;
        const sortedDates = history.map(a => {
            const d = new Date(a.checkInTime);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        }).sort((a, b) => b - a); // Most recent first

        const uniqueDates = [...new Set(sortedDates)];

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let checkDate = today.getTime();

        for (const attendanceDate of uniqueDates) {
            if (attendanceDate === checkDate) {
                streak++;
                checkDate -= 24 * 60 * 60 * 1000; // Go back one day
            } else if (attendanceDate < checkDate) {
                break; // Streak broken
            }
        }

        // Total hours (sum of all durations)
        const totalMinutes = history.reduce((sum, a) => sum + (a.duration || 0), 0);
        const totalHours = Math.round(totalMinutes / 60 * 10) / 10; // Round to 1 decimal

        // Completion percentage for this month
        const completionPercentage = Math.round((thisMonthAttendance.length / daysInMonth) * 100);

        res.json({
            history,
            stats: {
                totalWorkouts: history.length,
                currentStreak: streak,
                thisMonth: thisMonthAttendance.length,
                completionPercentage,
                totalHours,
                attendedDates: uniqueDates.map(d => new Date(d).toISOString().split('T')[0])
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { generateCheckInToken, checkIn, getHistory, manualCheckIn, checkOut };
