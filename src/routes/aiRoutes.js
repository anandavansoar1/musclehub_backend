const express = require('express');
const router = express.Router();
const { generateWorkout } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.post('/generate-workout', protect, generateWorkout);

module.exports = router;
