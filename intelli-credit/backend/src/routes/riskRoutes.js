const express = require('express');
const router = express.Router();
const { getRiskScore } = require('../controllers/analysisController');

router.get('/:companyId', getRiskScore);

module.exports = router;
