const asyncHandler = require('express-async-handler');
const PlatformPayment = require('../models/PlatformPayment');
const Gym = require('../models/Gym');

// @desc    Create new platform payment request
// @route   POST /api/platform-payments/request
// @access  Private (Gym Owner)
const createPaymentRequest = asyncHandler(async (req, res) => {
    const { gymId, planRequested, days, amount, transactionRef } = req.body;

    if (!gymId || !planRequested || !days || !amount || !transactionRef) {
        res.status(400);
        throw new Error('Please provide all required fields');
    }

    const payment = await PlatformPayment.create({
        gym: gymId,
        requestedBy: req.user._id,
        planRequested,
        days,
        amount,
        transactionRef
    });

    res.status(201).json(payment);
});

// @desc    Get all platform payments
// @route   GET /api/platform-payments
// @access  Private/Admin
const getPaymentRequests = asyncHandler(async (req, res) => {
    // Super admins fetch all
    const payments = await PlatformPayment.find({})
        .populate('gym', 'name location')
        .populate('requestedBy', 'name email phone')
        .sort({ createdAt: -1 });
    
    res.json(payments);
});

// @desc    Approve a payment request and extend gym subscription
// @route   PUT /api/platform-payments/:id/approve
// @access  Private/Admin
const approvePaymentRequest = asyncHandler(async (req, res) => {
    const payment = await PlatformPayment.findById(req.params.id);

    if (!payment) {
        res.status(404);
        throw new Error('Payment request not found');
    }

    if (payment.status === 'Approved') {
        res.status(400);
        throw new Error('Payment is already approved');
    }

    const gym = await Gym.findById(payment.gym);
    if (!gym) {
        res.status(404);
        throw new Error('Associated gym not found');
    }

    // Calculate new end date
    const currentDate = gym.subscriptionEndDate && gym.subscriptionEndDate > new Date() 
        ? new Date(gym.subscriptionEndDate) 
        : new Date();
    
    currentDate.setDate(currentDate.getDate() + payment.days);
    
    gym.subscriptionEndDate = currentDate;
    await gym.save();

    // Update payment status
    payment.status = 'Approved';
    payment.approvedBy = req.user._id;
    await payment.save();

    res.json(payment);
});

module.exports = {
    createPaymentRequest,
    getPaymentRequests,
    approvePaymentRequest
};
