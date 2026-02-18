const asyncHandler = require('express-async-handler');
const Gym = require('../models/Gym');
const User = require('../models/User');

/**
 * Helper: Get or create the gym for the logged-in admin.
 * Used internally by other controllers to resolve gymId.
 */
const getGymIdForAdmin = async (adminUserId) => {
    const gym = await Gym.findOne({ owner: adminUserId });
    return gym ? gym._id : null;
};

// @desc    Get the gym profile for the logged-in admin
// @route   GET /api/gym
// @access  Private/Admin
const getGym = asyncHandler(async (req, res) => {
    const gym = await Gym.findOne({ owner: req.user._id }).populate('owner', 'name email');

    if (gym) {
        res.json(gym);
    } else {
        res.status(404).json({ message: 'Gym profile not found. Please create one.' });
    }
});

// @desc    Create a gym profile for the logged-in admin
// @route   POST /api/gym
// @access  Private/Admin
const createGym = asyncHandler(async (req, res) => {
    const existing = await Gym.findOne({ owner: req.user._id });
    if (existing) {
        res.status(400).json({ message: 'Gym profile already exists. Use PUT to update.' });
        return;
    }

    const {
        name, tagline, logo, phone, email, address,
        city, state, pincode, openTime, closeTime, openOnSunday, maxCapacity
    } = req.body;

    const gym = await Gym.create({
        owner: req.user._id,
        name: name || req.user.name,
        tagline,
        logo,
        phone,
        email,
        address,
        city,
        state,
        pincode,
        openTime,
        closeTime,
        openOnSunday,
        maxCapacity,
    });

    res.status(201).json(gym);
});

// @desc    Update the gym profile for the logged-in admin
// @route   PUT /api/gym
// @access  Private/Admin
const updateGym = asyncHandler(async (req, res) => {
    const gym = await Gym.findOne({ owner: req.user._id });

    if (!gym) {
        res.status(404).json({ message: 'Gym not found' });
        return;
    }

    const fields = [
        'name', 'tagline', 'logo', 'phone', 'email', 'address',
        'city', 'state', 'pincode', 'openTime', 'closeTime',
        'openOnSunday', 'maxCapacity'
    ];

    fields.forEach(field => {
        if (req.body[field] !== undefined) {
            gym[field] = req.body[field];
        }
    });

    const updatedGym = await gym.save();
    res.json(updatedGym);
});

// @desc    Get or auto-create gym for admin (used internally after registration)
// @route   POST /api/gym/init
// @access  Private/Admin
const initGym = asyncHandler(async (req, res) => {
    let gym = await Gym.findOne({ owner: req.user._id });

    if (!gym) {
        gym = await Gym.create({
            owner: req.user._id,
            name: req.body.gymName || req.user.name,
        });
    }

    res.json(gym);
});

// @desc    List all gyms (Super Admin use only - for platform management)
// @route   GET /api/gym/all
// @access  Private/Admin (future: SuperAdmin)
const listAllGyms = asyncHandler(async (req, res) => {
    const gyms = await Gym.find({})
        .populate('owner', 'name email createdAt')
        .sort({ createdAt: -1 });

    res.json({
        count: gyms.length,
        gyms,
    });
});

module.exports = {
    getGym,
    createGym,
    updateGym,
    initGym,
    listAllGyms,
    getGymIdForAdmin,
};
