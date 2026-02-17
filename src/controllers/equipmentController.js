const asyncHandler = require('express-async-handler');
const Equipment = require('../models/Equipment');

// @desc    Get all equipment
// @route   GET /api/equipment
// @access  Public
const getEquipment = asyncHandler(async (req, res) => {
    const equipment = await Equipment.find({}).sort({ createdAt: -1 });
    res.json(equipment);
});

// @desc    Add new equipment
// @route   POST /api/equipment
// @access  Private/Admin
const addEquipment = asyncHandler(async (req, res) => {
    const { name, type, purchaseDate, condition, maintenanceHistory } = req.body;

    const equipment = await Equipment.create({
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

// @desc    Update equipment (e.g., status, maintenance log)
// @route   PUT /api/equipment/:id
// @access  Private/Admin
const updateEquipment = asyncHandler(async (req, res) => {
    const equipment = await Equipment.findById(req.params.id);

    if (equipment) {
        equipment.name = req.body.name || equipment.name;
        equipment.type = req.body.type || equipment.type;
        equipment.condition = req.body.condition || equipment.condition;
        equipment.purchaseDate = req.body.purchaseDate || equipment.purchaseDate;

        if (req.body.maintenanceLog) {
            equipment.maintenanceHistory.push(req.body.maintenanceLog);
            equipment.lastMaintenanceDate = req.body.maintenanceLog.maintenanceDate || Date.now();
        }

        const updatedEquipment = await equipment.save();
        res.json(updatedEquipment);
    } else {
        res.status(404);
        throw new Error('Equipment not found');
    }
});

// @desc    Delete equipment
// @route   DELETE /api/equipment/:id
// @access  Private/Admin
const deleteEquipment = asyncHandler(async (req, res) => {
    const equipment = await Equipment.findById(req.params.id);

    if (equipment) {
        await equipment.deleteOne();
        res.json({ message: 'Equipment removed' });
    } else {
        res.status(404);
        throw new Error('Equipment not found');
    }
});

module.exports = {
    getEquipment,
    addEquipment,
    updateEquipment,
    deleteEquipment
};
