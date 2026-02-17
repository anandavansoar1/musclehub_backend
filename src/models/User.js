const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        unique: true,
        sparse: true, // Allows null/undefined to not conflict
    },
    phone: {
        type: String,
        unique: true,
        sparse: true,
    },
    password: {
        type: String,
        required: true,
    },
    linkedMemberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
        required: false
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    isAdmin: {
        type: Boolean,
        required: true,
        default: false,
    },
    premiumFeatureAccess: {
        type: Boolean,
        required: true,
        default: false, // Can be toggled by admin
    },
}, {
    timestamps: true,
});

// Middleware to hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to match entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
