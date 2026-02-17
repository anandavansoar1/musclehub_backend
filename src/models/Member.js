const mongoose = require('mongoose');

const memberSchema = mongoose.Schema({
    fullName: {
        type: String,
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false, // Optional - not all members may have user accounts
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
        type: String, // Removed enum to allow custom plan names
        required: true,
        default: 'Silver'
    },
    planDuration: {
        type: String, // Monthly, Yearly, etc.
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
