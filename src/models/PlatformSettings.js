const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PlatformSettingsSchema = new mongoose.Schema({
    upiId: {
        type: String,
        required: true,
        default: 'musclehub@upi'
    },
    plans: [{
        id: { type: String, required: true },
        label: { type: String, required: true },
        days: { type: Number, required: true },
        amount: { type: Number, required: true }
    }],
    superAdminPassword: {
        type: String,
        required: true,
        // Pre-hashed '1234' using bcrypt as the default
        default: '$2a$10$w8T0h/NqXN6R2S5i.6M0/.fQ6/b8t9kR9V0F.q70K6Y/Y6/z56/qO' 
    }
}, { timestamps: true });

PlatformSettingsSchema.pre('save', async function (next) {
    if (!this.isModified('superAdminPassword')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.superAdminPassword = await bcrypt.hash(this.superAdminPassword, salt);
    next();
});

PlatformSettingsSchema.methods.matchSuperAdminPassword = async function (enteredPassword) {
    // If the database document is old and doesn't have the password field yet, use the default hash for '1234'
    const storedHash = this.superAdminPassword || '$2a$10$w8T0h/NqXN6R2S5i.6M0/.fQ6/b8t9kR9V0F.q70K6Y/Y6/z56/qO';
    return await bcrypt.compare(enteredPassword, storedHash);
};

module.exports = mongoose.model('PlatformSettings', PlatformSettingsSchema);
