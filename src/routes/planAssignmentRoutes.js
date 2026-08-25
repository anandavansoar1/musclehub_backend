const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getDietPlan,
    updateDietPlan,
    getWorkoutPlan,
    updateWorkoutPlan
} = require('../controllers/planAssignmentController');

// All plan routes require authentication
router.route('/members/:memberId/diet')
    .get(protect, getDietPlan)
    .post(protect, updateDietPlan);

router.route('/members/:memberId/workout')
    .get(protect, getWorkoutPlan)
    .post(protect, updateWorkoutPlan);

module.exports = router;
