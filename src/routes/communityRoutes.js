const express = require('express');
const router = express.Router();
const {
    getLeaderboard,
    getCommunityPosts,
    getMyBadges
} = require('../controllers/communityController');
const { protect } = require('../middleware/authMiddleware');

router.get('/leaderboard', protect, getLeaderboard);
router.get('/posts', protect, getCommunityPosts);
router.get('/badges', protect, getMyBadges);

module.exports = router;
