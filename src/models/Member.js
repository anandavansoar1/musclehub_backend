const mongoose = require('mongoose');

const memberSchema = mongoose.Schema({
    // References the Gym collection (not User) for clean separation
    gymId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gym',
        required: true,
    },
    fullName: {
        type: String,
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },
    phone: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: false,
    },
    membershipType: {
        type: String,
        required: true,
        default: 'Silver'
    },
    planDuration: {
        type: String,
        required: false
    },
    price: {
        type: Number,
        required: false
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Expired', 'Frozen'],
        default: 'Active'
    },
    trainer: {
        type: String,
        default: 'None'
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: false
    },
    address: {
        type: String,
        required: false
    },
    emergencyContact: {
        type: String,
        required: false
    },
    image: {
        type: String,
        required: false
    },
    lastCheckIn: {
        type: Date,
        required: false
    }
}, {
    timestamps: true,
});

const Member = mongoose.model('Member', memberSchema);
module.exports = Member;
