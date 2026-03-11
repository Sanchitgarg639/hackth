const express = require('express');
const router = express.Router();
const { getRiskScore, computeRiskScore, getTriangulationResult } = require('../controllers/riskController');

// POST /api/v1/risk/score — Compute risk score actively (MUST be before /:companyId)
router.post('/score', computeRiskScore);

// GET /api/v1/risk/triangulate/:analysisId
router.get('/triangulate/:analysisId', getTriangulationResult);

// GET /api/v1/risk/:companyId — Get risk score for a company
router.get('/:companyId', getRiskScore);

module.exports = router;
