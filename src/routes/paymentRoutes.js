const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { getPayments, createPayment, getMemberPayments, getMyPayments } = require('../controllers/paymentController');

router.route('/')
    .get(protect, admin, getPayments)
    .post(protect, admin, createPayment);

// Must be BEFORE /:memberId to avoid route conflict
router.route('/my').get(protect, getMyPayments);

router.route('/:memberId').get(protect, admin, getMemberPayments);

module.exports = router;
