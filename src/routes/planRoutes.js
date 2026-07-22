const express = require('express');
const router = express.Router();
const { getPlans, createPlan, deletePlan, updatePlan, generateDefaultPlans } = require('../controllers/planController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getPlans)
    .post(protect, admin, createPlan);

router.post('/generate', protect, admin, generateDefaultPlans);

router.route('/:id')
    .delete(protect, admin, deletePlan)
    .put(protect, admin, updatePlan);

module.exports = router;
