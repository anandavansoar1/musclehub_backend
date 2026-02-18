const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { getPayments, createPayment, getMemberPayments } = require('../controllers/paymentController');

router.route('/')
    .get(protect, admin, getPayments)
    .post(protect, admin, createPayment);

router.route('/:memberId').get(protect, admin, getMemberPayments);

module.exports = router;
