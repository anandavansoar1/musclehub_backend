const mongoose = require('mongoose');

const DietPlanSchema = new mongoose.Schema({
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
    meals: [{
        timeOfDay: { type: String, required: true }, // e.g. "Breakfast", "7:00 AM"
        mealName: { type: String, required: true },
        description: { type: String, required: false },
        calories: { type: String, required: false }
    }]
}, {
    timestamps: true,
});

const DietPlan = mongoose.model('DietPlan', DietPlanSchema);
module.exports = DietPlan;
