const Attendance = require('../models/Attendance');
const Member = require('../models/Member');
const Gym = require('../models/Gym');
const jwt = require('jsonwebtoken');

// @desc    Generate a short-lived QR token for check-in
// @route   GET /api/attendance/token
// @access  Admin
const generateCheckInToken = async (req, res) => {
    try {
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
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.type !== 'checkin_session') throw new Error('Invalid token type');
        } catch (err) {
            return res.status(400).json({ message: 'Invalid or expired QR code' });
        }

        if (!req.user.linkedMemberId) {
            return res.status(400).json({ message: 'No active membership found' });
        }

        const member = await Member.findById(req.user.linkedMemberId);
        if (!member) return res.status(404).json({ message: 'Member profile not found' });
        if (member.status !== 'Active') return res.status(400).json({ message: 'Membership is not active' });

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
            gymId: member.gymId, // Inherit gymId from the member's gym
            user: req.user._id,
            member: member._id,
            date: new Date(),
            method: 'qr'
        });

        res.status(201).json({ success: true, message: 'Check-in successful!', data: attendance });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Manual check-in by admin (no QR required)
// @route   POST /api/attendance/manual-checkin
// @access  Admin
const manualCheckIn = async (req, res) => {
    const { memberId } = req.body;

    try {
        if (!memberId) return res.status(400).json({ message: 'Member ID is required' });

        const member = await Member.findById(memberId);
        if (!member) return res.status(404).json({ message: 'Member not found' });
        if (member.status !== 'Active') {
            return res.status(400).json({ message: `Membership is ${member.status}. Cannot check in.` });
        }

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
            gymId: member.gymId, // Inherit gymId from the member's gym
            user: member.userId || undefined,
            member: member._id,
            date: new Date(),
            method: 'manual'
        });

        res.status(201).json({ success: true, message: 'Manual check-in successful!', data: attendance });

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

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            member: req.user.linkedMemberId,
            checkInTime: { $gte: startOfDay },
            checkOutTime: null
        });

        if (!attendance) {
            return res.status(404).json({ message: 'No active check-in found for today' });
        }

        const checkOutTime = new Date();
        const durationMinutes = Math.round((checkOutTime - attendance.checkInTime) / (1000 * 60));

        attendance.checkOutTime = checkOutTime;
        attendance.duration = durationMinutes;
        await attendance.save();

        res.json({ success: true, message: 'Check-out successful!', duration: durationMinutes, data: attendance });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get attendance history for the logged-in user
// @route   GET /api/attendance/history
// @access  Private
const getHistory = async (req, res) => {
    try {
        if (!req.user.linkedMemberId) {
            return res.status(400).json({ message: 'No active membership found' });
        }

        const history = await Attendance.find({ member: req.user.linkedMemberId })
            .sort({ checkInTime: -1 });

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

        const thisMonthAttendance = history.filter(a => new Date(a.checkInTime) >= startOfMonth);

        // Fetch gym settings from the member's own gym (not the first admin)
        const member = await Member.findById(req.user.linkedMemberId);
        let gymOpenOnSunday = true;
        if (member && member.gymId) {
            const gym = await Gym.findById(member.gymId);
            if (gym) gymOpenOnSunday = gym.openOnSunday;
        }

        // Calculate streak
        const sortedDates = history.map(a => {
            const d = new Date(a.checkInTime);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        }).sort((a, b) => b - a);

        const uniqueDates = [...new Set(sortedDates)];
        const attendanceSet = new Set(uniqueDates);

        let currentCheckDate = new Date();
        currentCheckDate.setHours(0, 0, 0, 0);
        let streakCount = 0;

        for (let i = 0; i < 365; i++) {
            const checkTime = currentCheckDate.getTime();
            const dayOfWeek = currentCheckDate.getDay();

            if (attendanceSet.has(checkTime)) {
                streakCount++;
            } else {
                if (dayOfWeek === 0 && !gymOpenOnSunday) {
                    // Sunday, gym closed — skip without breaking streak
                } else if (i === 0) {
                    // Today, hasn't attended yet — check yesterday
                } else {
                    break;
                }
            }
            currentCheckDate.setDate(currentCheckDate.getDate() - 1);
        }

        const totalMinutes = history.reduce((sum, a) => sum + (a.duration || 0), 0);
        const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
        const completionPercentage = Math.round((thisMonthAttendance.length / daysInMonth) * 100);

        res.json({
            history,
            stats: {
                totalWorkouts: history.length,
                currentStreak: streakCount,
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
