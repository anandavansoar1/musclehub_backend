const PlatformSettings = require('../models/PlatformSettings');
const Gym = require('../models/Gym');

const DEFAULT_PLANS = [
    { id: '1_month', label: '1 Month', days: 30, amount: 999 },
    { id: '3_months', label: '3 Months', days: 90, amount: 2499 },
    { id: '6_months', label: '6 Months', days: 180, amount: 4499 },
    { id: '1_year', label: '1 Year', days: 365, amount: 7999 },
];

// @desc    Get Platform Settings (Smart Fetch)
// @route   GET /api/platform-settings
// @access  Private
const getPlatformSettings = async (req, res) => {
    try {
        let settings = await PlatformSettings.findOne();
        
        if (!settings) {
            settings = await PlatformSettings.create({
                upiId: 'musclehub@upi',
                plans: DEFAULT_PLANS
            });
        }

        let responseData = {
            upiId: settings.upiId,
            plans: settings.plans
        };

        // If a gym owner is requesting (admin role), find their Gym document
        if (req.user && req.user.role === 'admin' && !req.user.isSuperAdmin) {
            const gym = await Gym.findOne({ owner: req.user._id });
            if (gym) {
                if (gym.customUpiId) {
                    responseData.upiId = gym.customUpiId;
                }
                if (gym.customPlatformPlans && gym.customPlatformPlans.length > 0) {
                    responseData.plans = gym.customPlatformPlans;
                }
            }
        }
        
        res.json(responseData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update Platform Settings
// @route   PUT /api/platform-settings
// @access  Private/SuperAdmin
const updatePlatformSettings = async (req, res) => {
    try {
        const { upiId, plans } = req.body;
        
        let settings = await PlatformSettings.findOne();
        if (!settings) {
            settings = new PlatformSettings();
        }
        
        settings.upiId = upiId;
        settings.plans = plans;
        
        const updatedSettings = await settings.save();
        res.json(updatedSettings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update Custom Platform Plans for a specific Gym
// @route   PUT /api/platform-settings/gym/:gymId/custom-plans
// @access  Private/SuperAdmin
const updateGymCustomPlans = async (req, res) => {
    try {
        const { plans, upiId } = req.body;
        
        const gym = await Gym.findById(req.params.gymId);
        if (!gym) {
            return res.status(404).json({ message: 'Gym not found' });
        }

        gym.customPlatformPlans = plans || [];
        if (upiId !== undefined) {
            gym.customUpiId = upiId;
        }
        await gym.save();

        res.json({ message: 'Gym custom settings updated successfully', customPlatformPlans: gym.customPlatformPlans, customUpiId: gym.customUpiId });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getPlatformSettings,
    updatePlatformSettings,
    updateGymCustomPlans
};
