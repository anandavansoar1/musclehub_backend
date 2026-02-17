const express = require('express');
const router = express.Router();
const {
    getMembers,
    addMember,
    getMemberById,
    updateMember,
    deleteMember
} = require('../controllers/memberController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, admin, getMembers)
    .post(protect, admin, addMember);

router.route('/:id')
    .get(protect, admin, getMemberById)
    .put(protect, admin, updateMember)
    .delete(protect, admin, deleteMember);

module.exports = router;
