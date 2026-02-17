const asyncHandler = require('express-async-handler');
const Member = require('../models/Member');

// @desc    Get all members
// @route   GET /api/members
// @access  Private/Admin
const getMembers = asyncHandler(async (req, res) => {
    const { keyword, filter } = req.query;

    let query = {};

    // Search by name or phone
    if (keyword) {
        query = {
            $or: [
                { fullName: { $regex: keyword, $options: 'i' } },
                { phone: { $regex: keyword, $options: 'i' } }
            ]
        };
    }

    // Filter by status if provided (Active, Expired, etc)
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

const User = require('../models/User');

// @desc    Add a new member
// @route   POST /api/members
// @access  Private/Admin
const addMember = asyncHandler(async (req, res) => {
    const { fullName, phone, email, membershipType, durationMonths, trainer, gender, address, emergencyContact, price, planDuration } = req.body;

    if (!fullName || !phone || !membershipType) {
        res.status(400);
        throw new Error('Please fill in all required fields');
    }

    // Check if user account already exists (by email or phone)
    let existingUserQuery = [];
    if (email) existingUserQuery.push({ email });
    existingUserQuery.push({ phone });

    // Note: We are creating MEMBER first, then USER. Or usually USER first?
    // Let's create Member first.

    // Calculate End Date
    const endDate = new Date();
    const monthsToAdd = durationMonths ? Number(durationMonths) : (planDuration === 'Yearly' ? 12 : planDuration === 'Quarterly' ? 3 : 1);
    endDate.setMonth(endDate.getMonth() + monthsToAdd);

    const member = await Member.create({
        fullName,
        phone,
        email,
        membershipType, // ... rest of fields
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

    if (member) {
        // AUTOMATICALLY CREATE USER LOGIN
        // Default password: Same as phone number
        const defaultPassword = phone;

        try {
            const newUser = await User.create({
                name: fullName,
                email: email || undefined, // If empty string, send undefined to use sparse index or just don't send
                phone: phone,
                password: defaultPassword,
                role: 'user',
                linkedMemberId: member._id
            });

            // Update member with userId for bidirectional linking
            member.userId = newUser._id;
            await member.save();

            console.log(`Auto-created user account for member: ${fullName} with userId: ${newUser._id}`);
        } catch (userError) {
            console.error(`Failed to auto-create user for ${fullName}: ${userError.message}`);
            // Don't fail the member creation, but maybe warn?
            // Since phone is unique in User, if they already exist, this might fail.
            // That's acceptable - they might already have an account.
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
    const member = await Member.findById(req.params.id);

    if (member) {
        res.json(member);
    } else {
        res.status(404);
        throw new Error('Member not found');
    }
});

// @desc    Update member (Renew, Freeze, Edit)
// @route   PUT /api/members/:id
// @access  Private/Admin
const updateMember = asyncHandler(async (req, res) => {
    const member = await Member.findById(req.params.id);

    if (!member) {
        res.status(404);
        throw new Error('Member not found');
    }

    // Handle specific actions or general update
    const { action, durationMonths, ...updateData } = req.body;

    if (action === 'renew') {
        // Extend end date
        const currentEndDate = new Date(member.endDate) > new Date() ? new Date(member.endDate) : new Date();
        currentEndDate.setMonth(currentEndDate.getMonth() + (Number(durationMonths) || 1));
        member.endDate = currentEndDate;
        member.status = 'Active';
    } else if (action === 'freeze') {
        member.status = 'Frozen';
    } else if (action === 'unfreeze') {
        member.status = 'Active';
    } else {
        // General update
        Object.assign(member, updateData);
    }

    const updatedMember = await member.save();
    res.json(updatedMember);
});

// @desc    Delete member
// @route   DELETE /api/members/:id
// @access  Private/Admin
const deleteMember = asyncHandler(async (req, res) => {
    const member = await Member.findById(req.params.id);

    if (member) {
        await member.deleteOne();
        res.json({ message: 'Member removed' });
    } else {
        res.status(404);
        throw new Error('Member not found');
    }
});

module.exports = {
    getMembers,
    addMember,
    getMemberById,
    updateMember,
    deleteMember
};
