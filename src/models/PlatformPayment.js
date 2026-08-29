const mongoose = require('mongoose');

const platformPaymentSchema = mongoose.Schema({
    gym: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gym',
        required: true,
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    planRequested: {
        type: String,
        required: true, // e.g., "1 Month", "3 Months", "Custom"
    },
    days: {
        type: Number,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    transactionRef: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending',
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    notes: {
        type: String,
    }
}, {
    timestamps: true,
});

const PlatformPayment = mongoose.model('PlatformPayment', platformPaymentSchema);
module.exports = PlatformPayment;
