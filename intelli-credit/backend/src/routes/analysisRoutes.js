const express = require('express');
const router = express.Router();
const { analyzeCompany } = require('../controllers/analysisController');

router.post('/:companyId', analyzeCompany);

module.exports = router;
