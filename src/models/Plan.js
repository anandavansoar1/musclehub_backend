const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema({
    // References the Gym collection for clean separation
    gymId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gym',
        required: true,
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    duration: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    features: [{
        type: String
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Plan', PlanSchema);
