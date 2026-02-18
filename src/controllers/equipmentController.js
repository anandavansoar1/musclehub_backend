const asyncHandler = require('express-async-handler');
const Equipment = require('../models/Equipment');
const { getGymIdForAdmin } = require('./gymController');

// @desc    Get all equipment for the logged-in gym
// @route   GET /api/equipment
// @access  Private/Admin
const getEquipment = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    if (!gymId) return res.status(404).json({ message: 'Gym not found' });

    const equipment = await Equipment.find({ gymId }).sort({ createdAt: -1 });
    res.json(equipment);
});

// @desc    Add new equipment for the logged-in gym
// @route   POST /api/equipment
// @access  Private/Admin
const addEquipment = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    if (!gymId) return res.status(404).json({ message: 'Gym not found' });

    const { name, type, purchaseDate, condition, maintenanceHistory } = req.body;

    const equipment = await Equipment.create({
        gymId,
        name,
        type,
        purchaseDate,
        condition,
        maintenanceHistory
    });

    if (equipment) {
        res.status(201).json(equipment);
    } else {
        res.status(400);
        throw new Error('Invalid equipment data');
    }
});

// @desc    Update equipment (only if it belongs to this gym)
// @route   PUT /api/equipment/:id
// @access  Private/Admin
const updateEquipment = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    const equipment = await Equipment.findOne({ _id: req.params.id, gymId });

    if (equipment) {
        equipment.name = req.body.name || equipment.name;
        equipment.type = req.body.type || equipment.type;
        equipment.condition = req.body.condition || equipment.condition;
        equipment.purchaseDate = req.body.purchaseDate || equipment.purchaseDate;

        if (req.body.maintenanceLog) {
            equipment.maintenanceHistory.push(req.body.maintenanceLog);
        }

        const updatedEquipment = await equipment.save();
        res.json(updatedEquipment);
    } else {
        res.status(404);
        throw new Error('Equipment not found');
    }
});

// @desc    Delete equipment (only if it belongs to this gym)
// @route   DELETE /api/equipment/:id
// @access  Private/Admin
const deleteEquipment = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    const equipment = await Equipment.findOne({ _id: req.params.id, gymId });

    if (equipment) {
        await equipment.deleteOne();
        res.json({ message: 'Equipment removed' });
    } else {
        res.status(404);
        throw new Error('Equipment not found');
    }
});

module.exports = { getEquipment, addEquipment, updateEquipment, deleteEquipment };
