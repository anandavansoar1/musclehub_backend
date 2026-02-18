const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema({
    // References the Gym collection for clean separation
    gymId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gym',
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['Info', 'Alert', 'Offer', 'Update'],
        default: 'Info'
    },
    targetAudience: {
        type: String,
        enum: ['All', 'Members', 'Trainers'],
        default: 'All'
    },
    // Optional expiry — notifications older than this are hidden from users
    expiresAt: {
        type: Date,
        required: false,
        default: null,
    },
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
});

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
