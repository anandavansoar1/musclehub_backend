const asyncHandler = require('express-async-handler');
const Coach = require('../models/Coach');
const User = require('../models/User');
const Member = require('../models/Member');
const { getGymIdForAdmin } = require('./gymController');

// @desc    Get all coaches for a gym
// @route   GET /api/coaches
// @access  Private/Admin
const getCoaches = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    const coaches = await Coach.find({ gymId }).sort({ createdAt: -1 });
    res.json(coaches);
});

// @desc    Create a coach
// @route   POST /api/coaches
// @access  Private/Admin
const createCoach = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    const { name, phone, specialization, bio, photo, email, password } = req.body;

    // Check if email is already in use by a user
    if (email) {
        const userExists = await User.findOne({ email });
        if (userExists) {
            res.status(400);
            throw new Error('Email already in use');
        }
    }

    const coach = await Coach.create({
        gymId,
        name,
        phone,
        specialization,
        bio,
        photo,
    });

    // Create user account for coach if email and password provided
    if (email && password) {
        await User.create({
            name,
            email,
            phone,
            password,
            role: 'coach',
            isAdmin: false,
            premiumFeatureAccess: false,
            gymId, // Link to the same gym
            linkedCoachId: coach._id
        });
    }

    res.status(201).json(coach);
});

// @desc    Update a coach
// @route   PUT /api/coaches/:id
// @access  Private/Admin
const updateCoach = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    const { name, phone, specialization, bio, photo, isActive, password } = req.body;

    const coach = await Coach.findOne({ _id: req.params.id, gymId });

    if (!coach) {
        res.status(404);
        throw new Error('Coach not found');
    }

    coach.name = name || coach.name;
    coach.phone = phone || coach.phone;
    coach.specialization = specialization !== undefined ? specialization : coach.specialization;
    coach.bio = bio !== undefined ? bio : coach.bio;
    coach.photo = photo !== undefined ? photo : coach.photo;
    
    if (isActive !== undefined) {
        coach.isActive = isActive;
    }

    const updatedCoach = await coach.save();

    // If a new password was provided, find the linked User account and update it
    if (password) {
        const user = await User.findOne({ linkedCoachId: coach._id });
        if (user) {
            user.password = password;
            await user.save(); // This will trigger the pre-save hook to hash the new password
        } else {
            // User doesn't exist yet, create one now!
            await User.create({
                name: coach.name,
                email: req.body.email || `${coach.phone}@gym.com`, // Fallback email
                phone: coach.phone,
                password: password,
                role: 'coach',
                isAdmin: false,
                premiumFeatureAccess: false,
                gymId: coach.gymId,
                linkedCoachId: coach._id
            });
        }
    }

    res.json(updatedCoach);
});

// @desc    Delete a coach
// @route   DELETE /api/coaches/:id
// @access  Private/Admin
const deleteCoach = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    const coach = await Coach.findOne({ _id: req.params.id, gymId });

    if (!coach) {
        res.status(404);
        throw new Error('Coach not found');
    }

    await coach.deleteOne();
    res.json({ message: 'Coach removed' });
});

// @desc    Get coach dashboard data
// @route   GET /api/coaches/dashboard
// @access  Private/Coach
const getCoachDashboard = asyncHandler(async (req, res) => {
    // Only coaches can access this
    if (req.user.role !== 'coach') {
        res.status(403);
        throw new Error('Not authorized as a coach');
    }

    const coachId = req.user.linkedCoachId;
    if (!coachId) {
        res.status(404);
        throw new Error('Coach profile not linked to user');
    }

    const coach = await Coach.findById(coachId);
    if (!coach) {
        res.status(404);
        throw new Error('Coach profile not found');
    }

    // Find all members assigned to this coach's name in this gym
    const assignedMembers = await Member.find({ 
        gymId: req.user.gymId,
        trainer: coach.name
    }).sort({ createdAt: -1 });

    res.json({
        coach,
        assignedMembers,
        totalAssigned: assignedMembers.length
    });
});

module.exports = {
    getCoaches,
    createCoach,
    updateCoach,
    deleteCoach,
    getCoachDashboard,
};
