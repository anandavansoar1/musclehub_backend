const mongoose = require('mongoose');

/**
 * Gym Model - First-class entity representing a gym/fitness center.
 * Each admin user "owns" one Gym document.
 * All other data (Members, Payments, Inventory, Plans, etc.)
 * references this Gym via gymId for clean multi-tenancy separation.
 */
const gymSchema = new mongoose.Schema({
    // The admin user who owns/manages this gym
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true, // One gym per admin account
    },

    // Gym Identity
    name: {
        type: String,
        required: true,
        trim: true,
    },
    tagline: {
        type: String,
        trim: true,
        default: '',
    },
    logo: {
        type: String, // URL to logo image
        default: '',
    },

    // Contact & Location
    phone: {
        type: String,
        default: '',
    },
    email: {
        type: String,
        default: '',
    },
    address: {
        type: String,
        default: '',
    },
    city: {
        type: String,
        default: '',
    },
    state: {
        type: String,
        default: '',
    },
    pincode: {
        type: String,
        default: '',
    },

    // Operating Hours
    openTime: {
        type: String,
        default: '06:00',
    },
    closeTime: {
        type: String,
        default: '22:00',
    },
    openOnSunday: {
        type: Boolean,
        default: true,
    },

    // Capacity
    maxCapacity: {
        type: Number,
        default: 200,
    },

    // Subscription / Feature Access
    premiumFeatureAccess: {
        type: Boolean,
        default: false,
    },

    // Status
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

const Gym = mongoose.model('Gym', gymSchema);

module.exports = Gym;
