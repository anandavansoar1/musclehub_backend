const express = require('express');
const router = express.Router();
const { getDurations, createDuration, deleteDuration, updateDuration } = require('../controllers/durationController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getDurations)
    .post(protect, admin, createDuration);

router.route('/:id')
    .delete(protect, admin, deleteDuration)
    .put(protect, admin, updateDuration);

module.exports = router;
