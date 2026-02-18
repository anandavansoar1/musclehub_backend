const mongoose = require('mongoose');

const attendanceSchema = mongoose.Schema({
    // References the Gym collection for per-gym isolation
    gymId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gym',
        required: false, // Optional for backward compat with QR check-ins
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },
    member: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    checkInTime: {
        type: Date,
        default: Date.now,
    },
    checkOutTime: {
        type: Date,
        required: false,
    },
    duration: {
        type: Number, // Duration in minutes
        required: false,
    },
    method: {
        type: String,
        enum: ['qr', 'manual', 'auto'],
        default: 'qr',
    }
}, {
    timestamps: true,
});

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;
