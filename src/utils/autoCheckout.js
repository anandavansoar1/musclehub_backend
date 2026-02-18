const Attendance = require('../models/Attendance');

// Function to automatically check out users after 2 hours
const processAutoCheckouts = async () => {
    try {
        const threshold = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
        const now = new Date();

        // specific threshold date: older than 2 hours ago
        const cutOffTime = new Date(now.getTime() - threshold);

        // Find active sessions that started more than 2 hours ago
        const overdueSessions = await Attendance.find({
            checkOutTime: null,
            checkInTime: { $lt: cutOffTime }
        });

        if (overdueSessions.length > 0) {
            console.log(`Checking out ${overdueSessions.length} overdue sessions...`);

            for (const session of overdueSessions) {
                // Set checkout time to exactly 2 hours after checkin
                const checkInTime = new Date(session.checkInTime);
                const autoCheckOutTime = new Date(checkInTime.getTime() + threshold);

                session.checkOutTime = autoCheckOutTime;
                session.duration = 120; // 2 hours in minutes
                // session.method = 'auto'; // Optional: if we want to track it was auto (but method is usually check-in)

                await session.save();
            }
            console.log('Auto-checkout processing complete.');
        }
    } catch (error) {
        console.error('Error processing auto-checkouts:', error);
    }
};

module.exports = processAutoCheckouts;
