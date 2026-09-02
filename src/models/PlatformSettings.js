const mongoose = require('mongoose');

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
    }]
}, { timestamps: true });

module.exports = mongoose.model('PlatformSettings', PlatformSettingsSchema);
