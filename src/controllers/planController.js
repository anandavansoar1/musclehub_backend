const asyncHandler = require('express-async-handler');
const Plan = require('../models/Plan');
const { getGymIdForAdmin } = require('./gymController');

// @desc    Get all plans for the logged-in gym
// @route   GET /api/plans
// @access  Private/Admin
const getPlans = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    if (!gymId) return res.status(404).json({ message: 'Gym not found' });

    const plans = await Plan.find({ gymId });
    res.json(plans);
});

// @desc    Create a new plan
// @route   POST /api/plans
// @access  Private/Admin
const createPlan = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    if (!gymId) return res.status(404).json({ message: 'Gym not found' });

    const { name, duration, price, description, features } = req.body;

    const plan = await Plan.create({ gymId, name, duration, price, description, features });

    if (plan) {
        res.status(201).json(plan);
    } else {
        res.status(400);
        throw new Error('Invalid plan data');
    }
});

// @desc    Delete a plan
// @route   DELETE /api/plans/:id
// @access  Private/Admin
const deletePlan = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    const plan = await Plan.findOne({ _id: req.params.id, gymId });

    if (plan) {
        await plan.deleteOne();
        res.json({ message: 'Plan removed' });
    } else {
        res.status(404);
        throw new Error('Plan not found');
    }
});

// @desc    Update a plan
// @route   PUT /api/plans/:id
// @access  Private/Admin
const updatePlan = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    const plan = await Plan.findOne({ _id: req.params.id, gymId });

    if (plan) {
        plan.name = req.body.name || plan.name;
        plan.duration = req.body.duration || plan.duration;
        plan.price = req.body.price || plan.price;
        plan.description = req.body.description || plan.description;
        plan.features = req.body.features || plan.features;

        const updatedPlan = await plan.save();
        res.json(updatedPlan);
    } else {
        res.status(404);
        throw new Error('Plan not found');
    }
});

// @desc    Generate default plans
// @route   POST /api/plans/generate
// @access  Private/Admin
const generateDefaultPlans = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    if (!gymId) return res.status(404).json({ message: 'Gym not found' });

    const defaultPlans = [
        { gymId, name: 'Normal', price: 600, duration: '1 Month', description: 'Standard gym membership plan' },
        { gymId, name: 'Normal + Treadmill', price: 700, duration: '1 Month', description: 'Gym access with treadmill usage' },
        { gymId, name: 'Cardio', price: 800, duration: '1 Month', description: 'Full gym and cardio area access' }
    ];

    const createdPlans = await Plan.insertMany(defaultPlans);
    res.status(201).json(createdPlans);
});

module.exports = { getPlans, createPlan, deletePlan, updatePlan, generateDefaultPlans };

