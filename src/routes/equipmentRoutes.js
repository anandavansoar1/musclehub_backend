const express = require('express');
const router = express.Router();
const {
    getEquipment,
    addEquipment,
    updateEquipment,
    deleteEquipment
} = require('../controllers/equipmentController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getEquipment)
    .post(protect, admin, addEquipment);

router.route('/:id')
    .put(protect, admin, updateEquipment)
    .delete(protect, admin, deleteEquipment);

module.exports = router;
