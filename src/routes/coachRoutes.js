const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
    getCoaches,
    createCoach,
    updateCoach,
    deleteCoach,
    getCoachDashboard,
} = require('../controllers/coachController');

router.route('/')
    .get(protect, admin, getCoaches)
    .post(protect, admin, createCoach);

router.route('/dashboard')
    .get(protect, getCoachDashboard);

router.route('/:id')
    .put(protect, admin, updateCoach)
    .delete(protect, admin, deleteCoach);

module.exports = router;
