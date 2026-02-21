const asyncHandler = require('express-async-handler');
const WorkoutClass = require('../models/WorkoutClass');
const { getGymIdForAdmin } = require('./gymController');

// @desc    Get all upcoming classes
// @route   GET /api/classes
// @access  Private/Admin
const getClasses = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    if (!gymId) return res.status(404).json({ message: 'Gym not found' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const classes = await WorkoutClass.find({ gymId, date: { $gte: today } }).sort({ date: 1, timeString: 1 });
    res.json(classes);
});

// @desc    Add a class
// @route   POST /api/classes
// @access  Private/Admin
const addClass = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    const { name, trainer, date, timeString, studio } = req.body;

    const newClass = await WorkoutClass.create({
        gymId,
        name,
        trainer,
        date: new Date(date),
        timeString,
        studio
    });

    res.status(201).json(newClass);
});

// @desc    Delete a class
// @route   DELETE /api/classes/:id
// @access  Private/Admin
const deleteClass = asyncHandler(async (req, res) => {
    const gymId = await getGymIdForAdmin(req.user._id);
    const classItem = await WorkoutClass.findOne({ _id: req.params.id, gymId });

    if (classItem) {
        await classItem.deleteOne();
        res.json({ message: 'Class removed' });
    } else {
        res.status(404);
        throw new Error('Class not found');
    }
});

module.exports = { getClasses, addClass, deleteClass };
