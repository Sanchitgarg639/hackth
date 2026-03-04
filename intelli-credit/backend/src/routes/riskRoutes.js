const express = require('express');
const router = express.Router();
const { getRiskScore, computeRiskScore } = require('../controllers/riskController');

// GET /api/v1/risk/:companyId — Get risk score for a company
router.get('/:companyId', getRiskScore);

// POST /api/v1/risk/score — Compute risk score actively
router.post('/score', computeRiskScore);

module.exports = router;
