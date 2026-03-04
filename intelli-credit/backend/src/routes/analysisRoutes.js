const express = require('express');
const router = express.Router();
const { startAnalysis, getAnalysis } = require('../controllers/analysisController');

// POST /api/v1/analyze — Start a new analysis
router.post('/', startAnalysis);

// GET /api/v1/analyze/:id — Get analysis status/result (for polling)
router.get('/:id', getAnalysis);

module.exports = router;
