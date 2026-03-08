const Analysis = require('../models/Analysis');
const Company = require('../models/Company');
const ResearchFinding = require('../models/ResearchFinding');
const QualitativeAssessment = require('../models/QualitativeAssessment');
const { callRisk } = require('../services/aiClient');
const { logger } = require('../utils/logger');

/**
 * POST /api/v1/risk/score
 * Compute Risk Score actively using all Phase 1-3 data.
 * Used instead of GET when triggering manual re-evaluations.
 */
exports.computeRiskScore = async (req, res, next) => {
	try {
		const { companyId, manualInputs } = req.body;
		if (!companyId) return res.status(400).json({ error: { message: "companyId is required" } });

		logger.info(`[${req.id}] Aggregating data for Risk Engine scoring for company ${companyId}`);
		
		// 1. Fetch Phase 2 Financials/Extraction Data from active Analysis
		const analysis = await Analysis.findOne({ companyId }).sort({ createdAt: -1 });
		if (!analysis || !analysis.extractedData || Object.keys(analysis.extractedData).length === 0) {
			return res.status(400).json({ error: { message: "No final extracted data found for company. Complete Phase 2 first." } });
		}
		
		// 2. Fetch Phase 3 Research & Qualitative
		const latestQualitative = await QualitativeAssessment.findOne({ companyId }).sort({ createdAt: -1 }) || {};
		const findings = await ResearchFinding.find({ companyId });
		
		const researchSummary = {
			avg_sentiment: findings.length ? findings.reduce((a, b) => a + b.sentimentScore, 0) / findings.length : 0,
			critical_count: findings.filter(f => f.sentimentLabel === 'CRITICAL').length,
			unique_risk_tags: [...new Set(findings.map(f => f.riskTags).flat())]
		};

		// 3. Build Full Payload
		const payload = {
			extractedData: analysis.extractedData,
			researchFindings: researchSummary,
			qualitativeAssessment: {
				siteVisitRating: latestQualitative.siteVisitRating || 3,
				managementQualityRating: latestQualitative.managementQualityRating || 3,
				notes: latestQualitative.notes || ''
			},
			manualInputs: manualInputs || {}
		};

		// 4. Call XGBoost Risk Engine
		let riskResult;
		try {
			riskResult = await callRisk(payload, req.id);
		} catch (error) {
			logger.error(`[${req.id}] Failed ML scoring, triggering fallback: ${error.message}`);
			riskResult = {
				score: 65,
				pd: 0.35,
				grade: 'BB+',
				expected_loss: 0,
				recommendation: 'REFER_TO_COMMITTEE',
				recommendedLimit: manualInputs?.requestedLimit || 0,
				suggestedInterestRate: '15.0%',
				reasons: [{factor: "System Error", text: "ML Model unreachable, used fallback defaults", impact: "Neutral"}],
				features_used: {}
			};
		}
		
		// 5. Update DB
		analysis.riskScore = riskResult.score;
		analysis.riskDetails = riskResult;
		await analysis.save();

		res.status(200).json(riskResult);

	} catch (error) {
		next(error);
	}
};

/**
 * GET /api/v1/risk/:companyId
 * Return the already scored risk details.
 */
exports.getRiskScore = async (req, res, next) => {
	try {
		const { companyId } = req.params;
		const analysis = await Analysis.findOne({ companyId }).sort({ createdAt: -1 });
		
		if (analysis && analysis.riskDetails) {
			return res.json({
				companyId,
				...analysis.riskDetails
			});
		}

		res.status(404).json({ error: { message: "Risk score not computed yet." } });
	} catch (error) {
		next(error);
	}
};
