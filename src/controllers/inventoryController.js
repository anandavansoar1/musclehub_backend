const asyncHandler = require('express-async-handler');
const Inventory = require('../models/Inventory');
const { getGymIdForAdmin } = require('./gymController');
const User = require('../models/User');
const { sendMulticastNotification } = require('../services/firebaseService');

// @desc    Get all inventory items for the logged-in gym
// @route   GET /api/inventory
// @access  Private
const getInventory = asyncHandler(async (req, res) => {
    let gymId = await getGymIdForAdmin(req.user._id);

    // If not admin, try to get gymId from user's linked Member profile
    if (!gymId) {
        const Member = require('../models/Member');
        const member = await Member.findOne({ userId: req.user._id });
        if (member) {
            gymId = member.gymId;
        } else if (req.user.gymId) {
            gymId = req.user.gymId;
        }
    }

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
        const oldQuantity = item.quantity;
        const newQuantity = req.body.quantity !== undefined ? Number(req.body.quantity) : item.quantity;

        item.name = req.body.name || item.name;
        item.category = req.body.category || item.category;
        item.description = req.body.description || item.description;
        item.quantity = newQuantity;
        item.price = req.body.price !== undefined ? req.body.price : item.price;
        item.restockThreshold = req.body.restockThreshold !== undefined ? req.body.restockThreshold : item.restockThreshold;
        if (req.body.quantity !== undefined) item.lastRestocked = Date.now();

        const updatedItem = await item.save();

        // Trigger push notification if stock drops to or below threshold
        if (
            req.body.quantity !== undefined && 
            oldQuantity > updatedItem.restockThreshold && 
            newQuantity <= updatedItem.restockThreshold
        ) {
            try {
                const admins = await User.find({ gymId, role: { $in: ['admin', 'superadmin'] } });
                const tokens = admins.map(admin => admin.fcmToken).filter(token => token);
                
                if (tokens.length > 0) {
                    await sendMulticastNotification(
                        tokens,
                        'Low Stock Alert ⚠️',
                        `${updatedItem.name} is running low! Only ${newQuantity} left in stock.`,
                        { type: 'INVENTORY_ALERT', itemId: updatedItem._id.toString() }
                    );
                }
            } catch (err) {
                console.error('Error sending low stock notification:', err);
            }
        }

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
