const asyncHandler = require('express-async-handler');
const Duration = require('../models/Duration');
const { getGymIdForAdmin } = require('./gymController');

// @desc    Get all durations for the logged-in gym
// @route   GET /api/durations
// @access  Private/Admin
const getDurations = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    if (!gymId) return res.status(404).json({ message: 'Gym not found' });

    const durations = await Duration.find({ gymId }).sort({ value: 1 });
    res.json(durations);
});

// @desc    Create a new duration for the logged-in gym
// @route   POST /api/durations
// @access  Private/Admin
const createDuration = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    if (!gymId) return res.status(404).json({ message: 'Gym not found' });

    const { label, value } = req.body;

    // Check for duplicate within this gym only
    const existing = await Duration.findOne({ gymId, value });
    if (existing) {
        res.status(400);
        throw new Error('A duration with this value already exists for your gym');
    }

    const duration = await Duration.create({ gymId, label, value });

    if (duration) {
        res.status(201).json(duration);
    } else {
        res.status(400);
        throw new Error('Invalid duration data');
    }
});

// @desc    Delete a duration (only if it belongs to this gym)
// @route   DELETE /api/durations/:id
// @access  Private/Admin
const deleteDuration = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    const duration = await Duration.findOne({ _id: req.params.id, gymId });

    if (duration) {
        await duration.deleteOne();
        res.json({ message: 'Duration removed' });
    } else {
        res.status(404);
        throw new Error('Duration not found');
    }
});

module.exports = { getDurations, createDuration, deleteDuration };
