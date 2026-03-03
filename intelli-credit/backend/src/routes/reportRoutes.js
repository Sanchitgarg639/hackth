const express = require('express');
const router = express.Router();
const { generateAndDownloadCam } = require('../controllers/reportController');

router.get('/:companyId', generateAndDownloadCam);

module.exports = router;
