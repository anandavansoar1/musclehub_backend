const express = require('express');
const router = express.Router();
const { getPlans, createPlan, deletePlan, updatePlan } = require('../controllers/planController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getPlans)
    .post(protect, admin, createPlan);

router.route('/:id')
    .delete(protect, admin, deletePlan)
    .put(protect, admin, updatePlan);

module.exports = router;
