const asyncHandler = require('express-async-handler');
const Inventory = require('../models/Inventory');
const { getGymIdForAdmin } = require('./gymController');

// @desc    Get all inventory items for the logged-in gym
// @route   GET /api/inventory
// @access  Private/Admin
const getInventory = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    if (!gymId) return res.status(404).json({ message: 'Gym not found' });

    const items = await Inventory.find({ gymId }).sort({ createdAt: -1 });
    res.json(items);
});

// @desc    Add new inventory item
// @route   POST /api/inventory
// @access  Private/Admin
const addInventory = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    if (!gymId) return res.status(404).json({ message: 'Gym not found' });

    const { name, category, description, quantity, price, restockThreshold } = req.body;

    const item = await Inventory.create({
        gymId,
        name,
        category,
        description,
        quantity,
        price,
        restockThreshold
    });

    if (item) {
        res.status(201).json(item);
    } else {
        res.status(400);
        throw new Error('Invalid inventory data');
    }
});

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private/Admin
const updateInventory = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    const item = await Inventory.findOne({ _id: req.params.id, gymId });

    if (item) {
        item.name = req.body.name || item.name;
        item.category = req.body.category || item.category;
        item.description = req.body.description || item.description;
        item.quantity = req.body.quantity !== undefined ? req.body.quantity : item.quantity;
        item.price = req.body.price !== undefined ? req.body.price : item.price;
        item.restockThreshold = req.body.restockThreshold !== undefined ? req.body.restockThreshold : item.restockThreshold;
        if (req.body.quantity !== undefined) item.lastRestocked = Date.now();

        const updatedItem = await item.save();
        res.json(updatedItem);
    } else {
        res.status(404);
        throw new Error('Item not found');
    }
});

// @desc    Delete inventory item
// @route   DELETE /api/inventory/:id
// @access  Private/Admin
const deleteInventory = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    const item = await Inventory.findOne({ _id: req.params.id, gymId });

    if (item) {
        await item.deleteOne();
        res.json({ message: 'Item removed' });
    } else {
        res.status(404);
        throw new Error('Item not found');
    }
});

module.exports = { getInventory, addInventory, updateInventory, deleteInventory };
