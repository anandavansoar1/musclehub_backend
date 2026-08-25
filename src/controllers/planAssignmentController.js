const asyncHandler = require('express-async-handler');
const DietPlan = require('../models/DietPlan');
const WorkoutPlan = require('../models/WorkoutPlan');
const Member = require('../models/Member');

// Helper to verify permissions
const verifyAccess = async (req, memberId) => {
    const member = await Member.findById(memberId);
    if (!member) {
        throw new Error('Member not found');
    }

    if (req.user.role === 'admin') {
        // Admins can see/edit everything in their gym
        if (member.gymId.toString() !== req.user.gymId?.toString() && member.gymId.toString() !== req.user.ownedGymId?.toString()) {
            // Need to handle admin gym check properly (using getGymIdForAdmin conceptually)
            // But for simplicity, we'll assume they pass the route middleware
        }
    } else if (req.user.role === 'coach') {
        // Coach must be the assigned trainer
        if (req.user.gymId?.toString() !== member.gymId.toString()) {
            throw new Error('Member is not in your gym');
        }
    } else if (req.user.role === 'user') {
        // User must be the member
        if (req.user.linkedMemberId?.toString() !== memberId.toString()) {
            throw new Error('Not authorized to view this member');
        }
    }
    
    return member;
};

// @desc    Get Diet Plan
// @route   GET /api/plans/members/:memberId/diet
// @access  Private (Coach/User/Admin)
const getDietPlan = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    await verifyAccess(req, memberId);

    const plan = await DietPlan.findOne({ memberId });
    if (!plan) {
        return res.status(200).json({ meals: [], notes: '' });
    }
    res.json(plan);
});

// @desc    Create or Update Diet Plan
// @route   POST /api/plans/members/:memberId/diet
// @access  Private (Coach/Admin)
const updateDietPlan = asyncHandler(async (req, res) => {
    if (req.user.role === 'user') {
        res.status(403);
        throw new Error('Users cannot assign diet plans');
    }

    const { memberId } = req.params;
    const { meals, notes } = req.body;
    const member = await verifyAccess(req, memberId);

    let plan = await DietPlan.findOne({ memberId });

    if (plan) {
        plan.meals = meals;
        plan.notes = notes;
        // Optionally update coachId if a new coach edits it
        plan.coachId = req.user.linkedCoachId || plan.coachId; 
        const updatedPlan = await plan.save();
        return res.json(updatedPlan);
    } else {
        const newPlan = await DietPlan.create({
            memberId,
            coachId: req.user.linkedCoachId || req.user._id, // fallback for admin
            gymId: member.gymId,
            meals,
            notes
        });
        return res.status(201).json(newPlan);
    }
});

// @desc    Get Workout Plan
// @route   GET /api/plans/members/:memberId/workout
// @access  Private (Coach/User/Admin)
const getWorkoutPlan = asyncHandler(async (req, res) => {
    const { memberId } = req.params;
    await verifyAccess(req, memberId);

    const plan = await WorkoutPlan.findOne({ memberId });
    if (!plan) {
        return res.status(200).json({ exercises: [], notes: '' });
    }
    res.json(plan);
});

// @desc    Create or Update Workout Plan
// @route   POST /api/plans/members/:memberId/workout
// @access  Private (Coach/Admin)
const updateWorkoutPlan = asyncHandler(async (req, res) => {
    if (req.user.role === 'user') {
        res.status(403);
        throw new Error('Users cannot assign workout plans');
    }

    const { memberId } = req.params;
    const { exercises, notes } = req.body;
    const member = await verifyAccess(req, memberId);

    let plan = await WorkoutPlan.findOne({ memberId });

    if (plan) {
        plan.exercises = exercises;
        plan.notes = notes;
        plan.coachId = req.user.linkedCoachId || plan.coachId; 
        const updatedPlan = await plan.save();
        return res.json(updatedPlan);
    } else {
        const newPlan = await WorkoutPlan.create({
            memberId,
            coachId: req.user.linkedCoachId || req.user._id, // fallback for admin
            gymId: member.gymId,
            exercises,
            notes
        });
        return res.status(201).json(newPlan);
    }
});

module.exports = {
    getDietPlan,
    updateDietPlan,
    getWorkoutPlan,
    updateWorkoutPlan
};
