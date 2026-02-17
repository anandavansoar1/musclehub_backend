const express = require('express');
const router = express.Router();
const {
    getInventory,
    addInventory,
    updateInventory,
    deleteInventory
} = require('../controllers/inventoryController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getInventory)
    .post(protect, admin, addInventory);

router.route('/:id')
    .put(protect, admin, updateInventory)
    .delete(protect, admin, deleteInventory);

module.exports = router;
