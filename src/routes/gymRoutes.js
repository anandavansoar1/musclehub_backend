const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
    getGym,
    createGym,
    updateGym,
    initGym,
    listAllGyms,
    deleteGym,
} = require('../controllers/gymController');

// Get / Create / Update the logged-in admin's gym profile
router.route('/')
    .get(protect, admin, getGym)
    .post(protect, admin, createGym)
    .put(protect, admin, updateGym);

// Delete a gym (and all cascade data)
router.delete('/:id', protect, admin, deleteGym);

// Auto-init gym after registration
router.post('/init', protect, admin, initGym);

// List all gyms (platform-level view)
router.get('/all', protect, admin, listAllGyms);

module.exports = router;
