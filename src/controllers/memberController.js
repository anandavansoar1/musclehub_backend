const asyncHandler = require('express-async-handler');
const Member = require('../models/Member');
const User = require('../models/User');
const { getGymIdForAdmin } = require('./gymController');

// @desc    Get all members for the logged-in gym
// @route   GET /api/members
// @access  Private/Admin
const getMembers = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    if (!gymId) return res.status(404).json({ message: 'Gym profile not found. Please set up your gym first.' });

    const { keyword, filter } = req.query;
    let query = { gymId };

    if (keyword) {
        query = {
            gymId,
            $or: [
                { fullName: { $regex: keyword, $options: 'i' } },
                { phone: { $regex: keyword, $options: 'i' } }
            ]
        };
    }

    if (filter && filter !== 'All') {
        if (filter === 'Expiring') {
            const today = new Date();
            const nextWeek = new Date();
            nextWeek.setDate(today.getDate() + 7);
            query.status = 'Active';
            query.endDate = { $lte: nextWeek, $gte: today };
        } else {
            query.status = filter;
        }
    }

    const members = await Member.find(query).sort({ createdAt: -1 });
    res.json(members);
});

// @desc    Add a new member to the logged-in gym
// @route   POST /api/members
// @access  Private/Admin
const addMember = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    if (!gymId) return res.status(404).json({ message: 'Gym profile not found. Please set up your gym first.' });

    const { fullName, phone, email, membershipType, durationMonths, trainer, gender, address, emergencyContact, price, planDuration } = req.body;

    if (!fullName || !phone || !membershipType) {
        res.status(400);
        throw new Error('Please fill in all required fields');
    }

    const endDate = new Date();
    const monthsToAdd = durationMonths ? Number(durationMonths) : (planDuration === 'Yearly' ? 12 : planDuration === 'Quarterly' ? 3 : 1);
    endDate.setMonth(endDate.getMonth() + monthsToAdd);

    const member = await Member.create({
        gymId,
        fullName,
        phone,
        email,
        membershipType,
        planDuration,
        price,
        gender,
        address,
        emergencyContact,
        startDate: new Date(),
        endDate,
        trainer: trainer || 'None',
        status: 'Active'
    });

    const Payment = require('../models/Payment');

    if (member) {
        try {
            const newUser = await User.create({
                name: fullName,
                email: email || undefined,
                phone: phone,
                password: phone,
                role: 'user',
                linkedMemberId: member._id,
                gymId,
            });
            member.userId = newUser._id;
            await member.save();
        } catch (userError) {
            console.error(`Failed to auto-create user for ${fullName}: ${userError.message}`);
        }

        if (price > 0) {
            await Payment.create({
                gymId,
                member: member._id,
                amount: price,
                type: 'Membership',
                description: `Membership - ${membershipType}`,
                method: 'Cash',
                date: new Date(),
                status: 'Paid'
            });
        }

        res.status(201).json(member);
    } else {
        res.status(400);
        throw new Error('Invalid member data');
    }
});

// @desc    Get member by ID
// @route   GET /api/members/:id
// @access  Private/Admin
const getMemberById = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    const member = await Member.findOne({ _id: req.params.id, gymId });

    if (member) {
        res.json(member);
    } else {
        res.status(404);
        throw new Error('Member not found');
    }
});

// @desc    Update member
// @route   PUT /api/members/:id
// @access  Private/Admin
const updateMember = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    const member = await Member.findOne({ _id: req.params.id, gymId });

    if (!member) {
        res.status(404);
        throw new Error('Member not found');
    }

    const { action, durationMonths, ...updateData } = req.body;
    const Payment = require('../models/Payment');

    if (action === 'renew') {
        const currentEndDate = new Date(member.endDate) > new Date() ? new Date(member.endDate) : new Date();
        currentEndDate.setMonth(currentEndDate.getMonth() + (Number(durationMonths) || 1));
        member.endDate = currentEndDate;
        member.status = 'Active';

        const renewalPrice = updateData.price || member.price;
        if (renewalPrice > 0) {
            await Payment.create({
                gymId,
                member: member._id,
                amount: renewalPrice,
                type: 'Membership',
                description: `Renewal - ${member.membershipType}`,
                method: 'Cash',
                date: new Date(),
                status: 'Paid'
            });
        }
    } else if (action === 'freeze') {
        member.status = 'Frozen';
    } else if (action === 'unfreeze') {
        member.status = 'Active';
    } else {
        Object.assign(member, updateData);
    }

    const updatedMember = await member.save();
    res.json(updatedMember);
});

// @desc    Delete member
// @route   DELETE /api/members/:id
// @access  Private/Admin
const deleteMember = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    const member = await Member.findOne({ _id: req.params.id, gymId });

    if (member) {
        await member.deleteOne();
        res.json({ message: 'Member removed' });
    } else {
        res.status(404);
        throw new Error('Member not found');
    }
});

module.exports = { getMembers, addMember, getMemberById, updateMember, deleteMember };
