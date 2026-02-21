const mongoose = require('mongoose');

const workoutClassSchema = new mongoose.Schema({
    gymId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gym',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    trainer: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    timeString: {
        type: String,
        required: true // e.g., "10:00 AM"
    },
    studio: {
        type: String,
        default: 'Main Studio'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('WorkoutClass', workoutClassSchema);
