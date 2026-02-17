const mongoose = require('mongoose');

const attendanceSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
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
        enum: ['qr', 'manual'],
        default: 'qr',
    }
}, {
    timestamps: true,
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
