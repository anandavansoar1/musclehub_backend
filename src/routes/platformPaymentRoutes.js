const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
    createPaymentRequest,
    getPaymentRequests,
    approvePaymentRequest
} = require('../controllers/platformPaymentController');

router.route('/')
    .get(protect, admin, getPaymentRequests);

router.route('/request')
    .post(protect, createPaymentRequest); // Only logged-in users (Gym Owners) can request

router.route('/:id/approve')
    .put(protect, admin, approvePaymentRequest);

module.exports = router;
