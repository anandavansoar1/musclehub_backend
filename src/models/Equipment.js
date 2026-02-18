const mongoose = require('mongoose');

const equipmentSchema = mongoose.Schema({
    // References the Gym collection for per-gym isolation
    gymId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gym',
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    type: {
        type: String, // e.g., Cardio, Strength
        required: true
    },
    purchaseDate: {
        type: Date,
        required: true
    },
    condition: {
        type: String,
        enum: ['Excellent', 'Good', 'Fair', 'Needs Repair'],
        default: 'Excellent'
    },
    maintenanceHistory: [{
        maintenanceDate: {
            type: Date,
            required: true,
            default: Date.now
        },
        description: {
            type: String,
            required: true
        },
        cost: {
            type: Number,
            required: false
        },
        performedBy: {
            type: String,
            required: false
        }
    }],
    imageUrl: {
        type: String,
        required: false
    }
}, {
    timestamps: true,
});

const Equipment = mongoose.model('Equipment', equipmentSchema);
module.exports = Equipment;
