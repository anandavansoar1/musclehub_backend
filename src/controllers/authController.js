const User = require('../models/User');
const Member = require('../models/Member');
const generateToken = require('../utils/generateToken');

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body; // email field here is used as generic 'username' from frontend

    try {
        // Find by email OR phone
        const user = await User.findOne({
            $or: [
                { email: email },
                { phone: email } // Frontend sends input in 'email' field
            ]
        });

        if (user && (await user.matchPassword(password))) {
            // Fetch associated Member details
            let member = null;
            if (user.linkedMemberId) {
                member = await Member.findById(user.linkedMemberId);
            } else if (user.phone) {
                // Fallback: try to find member by phone
                member = await Member.findOne({ phone: user.phone });

                // Self-healing: Link them if found
                if (member) {
                    user.linkedMemberId = member._id;
                    await user.save();
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
                member: member, // Return full member details
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password, role, isAdmin } = req.body;

    console.log('Register request data:', { name, email, role, isAdmin });

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            console.log('User already exists:', email);
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            name,
            email,
            password,
            role: role || 'user',
            isAdmin: isAdmin || false,
        });

        if (user) {
            console.log('User created successfully:', user._id);
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isAdmin: user.isAdmin,
                premiumFeatureAccess: user.premiumFeatureAccess,
                token: generateToken(user._id),
            });
        } else {
            console.log('Invalid user data');
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
            // Fetch associated Member details
            let member = null;
            if (user.linkedMemberId) {
                member = await Member.findById(user.linkedMemberId);
            }

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isAdmin: user.isAdmin,
                premiumFeatureAccess: user.premiumFeatureAccess,
                linkedMemberId: user.linkedMemberId,
                member: member // Include full member details
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
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

module.exports = { loginUser, registerUser, getUserProfile, updateUserProfile };
