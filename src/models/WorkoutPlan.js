const mongoose = require('mongoose');

const WorkoutPlanSchema = new mongoose.Schema({
    memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
        required: true,
    },
    coachId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coach',
        required: true,
    },
    gymId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gym',
        required: true,
    },
    notes: {
        type: String,
        required: false
    },
    exercises: [{
        dayOfWeek: { type: String, required: true }, // e.g. "Monday", "Push Day"
        exerciseName: { type: String, required: true },
        sets: { type: String, required: true },
        reps: { type: String, required: true },
        restTime: { type: String, required: false }
    }]
}, {
    timestamps: true,
});

const WorkoutPlan = mongoose.model('WorkoutPlan', WorkoutPlanSchema);
module.exports = WorkoutPlan;
