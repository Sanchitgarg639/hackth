const express = require('express');
const router = express.Router();
const { getReport, generateReport, getSwot, downloadXlsx, downloadTriangulationPdf } = require('../controllers/reportController');

// POST /api/v1/report/generate — Generate CAM Document (MUST be before /:id)
router.post('/generate', generateReport);

// GET /api/v1/report/swot/:analysisId
router.get('/swot/:analysisId', getSwot);

// GET /api/v1/report/xlsx/:analysisId
router.get('/xlsx/:analysisId', downloadXlsx);

// GET /api/v1/report/triangulation-pdf/:analysisId
router.get('/triangulation-pdf/:analysisId', downloadTriangulationPdf);

// GET /api/v1/report/:analysisId — Get CAM report (MUST be last)
router.get('/:analysisId', getReport);

module.exports = router;
