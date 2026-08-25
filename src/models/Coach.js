const mongoose = require('mongoose');

const coachSchema = new mongoose.Schema({
    gymId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gym',
        required: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    phone: {
        type: String,
        required: true,
        trim: true,
    },
    specialization: {
        type: String,
        trim: true,
        default: '',
    },
    bio: {
        type: String,
        trim: true,
        default: '',
    },
    photo: {
        type: String, // Base64 or URL
        default: '',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

const Coach = mongoose.model('Coach', coachSchema);
module.exports = Coach;
