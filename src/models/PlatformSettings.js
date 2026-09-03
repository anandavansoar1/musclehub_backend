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
        default: '$2b$10$ZYXlfMZeDaGO/rle/hTBF.bDXJFybgMRaMPTIgl36NIVuCHjDPYDu' 
    }
}, { timestamps: true });

PlatformSettingsSchema.pre('save', async function () {
    if (!this.isModified('superAdminPassword')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.superAdminPassword = await bcrypt.hash(this.superAdminPassword, salt);
});

PlatformSettingsSchema.methods.matchSuperAdminPassword = async function (enteredPassword) {
    // If the database document is old and doesn't have the password field yet, use the default hash for '1234'
    const storedHash = this.superAdminPassword || '$2b$10$ZYXlfMZeDaGO/rle/hTBF.bDXJFybgMRaMPTIgl36NIVuCHjDPYDu';
    return await bcrypt.compare(enteredPassword, storedHash);
};

module.exports = mongoose.model('PlatformSettings', PlatformSettingsSchema);
