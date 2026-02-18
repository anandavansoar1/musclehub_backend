const mongoose = require('mongoose');

const inventorySchema = mongoose.Schema({
    // References the Gym collection for clean separation
    gymId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gym',
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        enum: ['Supplement', 'Merchandise', 'Gear', 'Other'],
        required: true
    },
    description: {
        type: String,
        required: false
    },
    quantity: {
        type: Number,
        required: true,
        default: 0
    },
    price: {
        type: Number,
        required: true,
        default: 0.0
    },
    imageUrl: {
        type: String,
        required: false
    },
    restockThreshold: {
        type: Number,
        default: 5
    },
    lastRestocked: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
});

const Inventory = mongoose.model('Inventory', inventorySchema);
module.exports = Inventory;
