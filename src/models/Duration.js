const mongoose = require('mongoose');

const DurationSchema = new mongoose.Schema({
    // References the Gym collection for per-gym isolation
    gymId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gym',
        required: true,
    },
    label: {
        type: String,
        required: true,
        trim: true
    },
    value: {
        type: Number, // Number of months
        required: true,
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Duration', DurationSchema);
