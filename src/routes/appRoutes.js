const express = require('express');
const router = express.Router();
const { getAppVersion } = require('../controllers/appController');

router.get('/version', getAppVersion);

module.exports = router;
