const User = require('../models/User');
const Member = require('../models/Member');
const Gym = require('../models/Gym');
const generateToken = require('../utils/generateToken');

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({
            $or: [{ email }, { phone: email }]
        });

        if (user && (await user.matchPassword(password))) {
            // Update FCM Token if provided in login
            if (req.body.fcmToken) {
                user.fcmToken = req.body.fcmToken;
                await user.save();
            }

            let member = null;
            if (user.linkedMemberId) {
                member = await Member.findById(user.linkedMemberId);
            } else if (user.phone) {
                member = await Member.findOne({ phone: user.phone });
                if (member) {
                    user.linkedMemberId = member._id;
                    await user.save();
                }
            }

            // Resolve gym name:
            // Admin → look up their Gym document
            // Member user → look up gym via their member record's gymId
            let gymName = 'MuscleHub';
            let gymId = null;

            if (user.role === 'admin') {
                const gym = await Gym.findOne({ owner: user._id });
                if (gym) {
                    gymName = gym.name;
                    gymId = gym._id;
                }
            } else if (member && member.gymId) {
                const gym = await Gym.findById(member.gymId);
                if (gym) {
                    gymName = gym.name;
                    gymId = gym._id;
                }
            }

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isAdmin: user.isAdmin,
                premiumFeatureAccess: user.premiumFeatureAccess,
                linkedMemberId: user.linkedMemberId,
                gymName,
                gymId,
                member,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Register a new admin user + auto-create their Gym document
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, phone, password, role, isAdmin, gymName } = req.body;

    console.log('Register request data:', { name, email, phone, role, isAdmin, gymName });

    try {
        const userExists = await User.findOne({ 
            $or: [{ email }, { phone }] 
        });
        
        if (userExists) {
            return res.status(400).json({ message: 'User already exists with this email or phone' });
        }

        // 1. Create the User account
        const user = await User.create({
            name,
            email,
            phone,
            password,
            role: role || 'user',
            isAdmin: isAdmin || false,
        });

        // 2. If registering as admin, auto-create a Gym document
        let gym = null;
        if (user && (role === 'admin' || isAdmin)) {
            gym = await Gym.create({
                owner: user._id,
                name: gymName || name, // Use provided gym name or fallback to admin's name
            });
            console.log(`Auto-created Gym document for admin: ${user.name} → Gym: ${gym.name} (${gym._id})`);
        }

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isAdmin: user.isAdmin,
                premiumFeatureAccess: user.premiumFeatureAccess,
                gymName: gym ? gym.name : null,
                gymId: gym ? gym._id : null,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Register Error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            let member = null;
            if (user.linkedMemberId) {
                member = await Member.findById(user.linkedMemberId);
            }

            let gymName = 'MuscleHub';
            let gymId = null;
            let gymProfile = null;

            if (user.role === 'admin') {
                gymProfile = await Gym.findOne({ owner: user._id });
                if (gymProfile) {
                    gymName = gymProfile.name;
                    gymId = gymProfile._id;
                }
            } else if (member && member.gymId) {
                gymProfile = await Gym.findById(member.gymId);
                if (gymProfile) {
                    gymName = gymProfile.name;
                    gymId = gymProfile._id;
                }
            }

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isAdmin: user.isAdmin,
                premiumFeatureAccess: user.premiumFeatureAccess,
                linkedMemberId: user.linkedMemberId,
                gymName,
                gymId,
                gymOpenOnSunday: gymProfile ? gymProfile.openOnSunday : user.gymOpenOnSunday,
                member,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            if (req.body.phone !== undefined) {
                user.phone = req.body.phone;
            }
            if (req.body.fcmToken) {
                user.fcmToken = req.body.fcmToken;
            }
            if (req.body.password) {
                user.password = req.body.password;
            }

            // If admin is updating gym-related settings, update the Gym document
            if (user.role === 'admin') {
                const gym = await Gym.findOne({ owner: user._id });
                if (gym) {
                    if (req.body.gymName) gym.name = req.body.gymName;
                    if (req.body.gymOpenOnSunday !== undefined) gym.openOnSunday = req.body.gymOpenOnSunday;
                    await gym.save();
                }
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                role: updatedUser.role,
                token: generateToken(updatedUser._id),
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// @desc    Update user profile by Super Admin
// @route   PUT /api/auth/users/:id/admin
// @access  Private/SuperAdmin
const updateUserBySuperAdmin = async (req, res) => {
    try {
        if (!req.user || !req.user.isSuperAdmin) {
            return res.status(403).json({ message: 'Not authorized as super admin' });
        }

        const user = await User.findById(req.params.id);

        if (user) {
            user.email = req.body.email || user.email;
            if (req.body.phone !== undefined) {
                user.phone = req.body.phone;
            }
            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                role: updatedUser.role,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { loginUser, registerUser, getUserProfile, updateUserProfile, updateUserBySuperAdmin };
