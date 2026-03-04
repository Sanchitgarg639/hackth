const express = require('express');
const router = express.Router();
const { getReport, generateReport } = require('../controllers/reportController');

// GET /api/v1/report/:analysisId — Get CAM report for an analysis
router.get('/:analysisId', getReport);

// POST /api/v1/report/generate — Generate CAM Document
router.post('/generate', generateReport);

module.exports = router;
