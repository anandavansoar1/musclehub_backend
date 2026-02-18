const mongoose = require('mongoose');

const paymentSchema = mongoose.Schema({
    // References the Gym collection for clean separation
    gymId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gym',
        required: true,
    },
    member: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    type: {
        type: String,
        enum: ['Membership', 'Supplement', 'Merchandise', 'Personal Training', 'Other'],
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    method: {
        type: String,
        enum: ['Cash', 'UPI', 'Card', 'Online'],
        default: 'Cash',
    },
    status: {
        type: String,
        enum: ['Paid', 'Pending', 'Failed'],
        default: 'Paid',
    }
}, {
    timestamps: true,
});

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
