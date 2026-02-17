const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema({
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
