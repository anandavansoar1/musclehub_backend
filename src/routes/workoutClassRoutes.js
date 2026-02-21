const express = require('express');
const router = express.Router();
const { getClasses, addClass, deleteClass } = require('../controllers/workoutClassController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, admin, getClasses)
    .post(protect, admin, addClass);

router.route('/:id')
    .delete(protect, admin, deleteClass);

module.exports = router;
