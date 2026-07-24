const asyncHandler = require('express-async-handler');
const Payment = require('../models/Payment');
const Member = require('../models/Member');
const { getGymIdForAdmin } = require('./gymController');

// @desc    Get all payments for the logged-in gym
// @route   GET /api/payments
// @access  Private/Admin
const getPayments = asyncHandler(async (req, res) => {
    let gymId = await getGymIdForAdmin(req.user._id);
    
    if (req.query.gymId && req.user.isAdmin) {
        gymId = req.query.gymId;
    } else if (!gymId) {
        return res.status(404).json({ message: 'Gym not found' });
    }

    const payments = await Payment.find({ gymId })
        .populate('member', 'fullName phone')
        .sort({ date: -1 });

    res.json(payments);
});

// @desc    Get payments by member (admin view)
// @route   GET /api/payments/:memberId
// @access  Private/Admin
const getMemberPayments = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    if (!gymId) return res.status(404).json({ message: 'Gym not found' });

    const member = await Member.findOne({ _id: req.params.memberId, gymId });
    if (!member) {
        res.status(404);
        throw new Error('Member not found or does not belong to your gym');
    }

    const payments = await Payment.find({ member: req.params.memberId, gymId })
        .populate('member', 'fullName phone')
        .sort({ date: -1 });

    res.json(payments);
});

// @desc    Get logged-in user's own payment history
// @route   GET /api/payments/my
// @access  Private (Member)
const getMyPayments = asyncHandler(async (req, res) => {
    if (!req.user.linkedMemberId) {
        return res.json([]);
    }

    const payments = await Payment.find({ member: req.user.linkedMemberId })
        .populate('member', 'fullName phone membershipType')
        .sort({ date: -1 });

    res.json(payments);
});

// @desc    Create a payment
// @route   POST /api/payments
// @access  Private/Admin
const createPayment = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    if (!gymId) return res.status(404).json({ message: 'Gym not found' });

    const { memberId, amount, type, description, method, date } = req.body;

    const payment = new Payment({
        gymId,
        member: memberId,
        amount,
        type,
        description,
        method: method || 'Cash',
        date: date || Date.now(),
        status: 'Paid'
    });

    const createdPayment = await payment.save();
    res.status(201).json(createdPayment);
});

// @desc    Migrate existing members to have payment records
const migratePayments = async () => {
    try {
        console.log('Starting payment migration...');
        const members = await Member.find({});
        let createdCount = 0;

        for (const member of members) {
            const existingPayment = await Payment.findOne({ member: member._id });
            if (!existingPayment && member.price > 0 && member.gymId) {
                await Payment.create({
                    gymId: member.gymId,
                    member: member._id,
                    amount: member.price,
                    type: 'Membership',
                    description: `Membership - ${member.membershipType}`,
                    method: 'Cash',
                    date: member.startDate || member.createdAt,
                    status: 'Paid'
                });
                createdCount++;
            }
        }

        console.log(`Migration complete: Created ${createdCount} payment records.`);
    } catch (error) {
        console.error('Migration failed:', error);
    }
};

module.exports = { getPayments, getMemberPayments, getMyPayments, createPayment, migratePayments };
