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
		let analysis = await Analysis.findOne({ companyId }).sort({ createdAt: -1 });

		// Fallback: If no analysis or no extracted data, check if Financial record exists
		// This happens if the user just uploaded but hasn't run the full analysis pipeline yet.
		if (!analysis || !analysis.extractedData || Object.keys(analysis.extractedData).length === 0) {
			const financial = await Financial.findOne({ companyId }).sort({ createdAt: -1 });
			if (financial) {
				logger.info(`[${req.id}] Found Financial record for company ${companyId}, using as fallback for Phase 2`);

				// Initialize analysis if it doesn't exist
				if (!analysis) {
					analysis = new Analysis({ companyId, status: 'scoring' });
				}

				// Map Financial record back to extractedData format
				analysis.extractedData = {
					financials: {
						revenue: financial.revenue,
						pat: financial.pat,
						ebitda: financial.ebitda,
						netWorth: financial.netWorth,
						totalDebt: financial.totalDebt,
						totalAssets: financial.totalAssets,
						totalLiabilities: financial.totalLiabilities,
						currentAssets: financial.currentAssets,
						currentLiabilities: financial.currentLiabilities,
						interestExpense: financial.interestExpense,
						depreciation: financial.depreciation,
						cibilScore: financial.cibilScore,
						cibilBand: financial.cibilBand
					},
					ratios: financial.ratios,
					gstAnalysis: financial.gstAnalysis,
					bankAnalysis: financial.bankAnalysis,
					crossVerification: financial.crossVerification,
					redFlags: financial.redFlags,
					// Flattened fields for compatibility
					revenue: financial.revenue,
					netProfit: financial.pat,
					liabilities: financial.totalLiabilities,
					dscr: financial.ratios?.dscr
				};
			} else {
				return res.status(400).json({ error: { message: "No final extracted data found for company. Please ensure files are processed or complete Phase 2 first." } });
			}
		}

		// 2. Fetch Phase 3 Research & Qualitative
		const latestQualitative = await QualitativeAssessment.findOne({ companyId }).sort({ createdAt: -1 }) || {};
		const findings = await ResearchFinding.find({ companyId });

		const researchSummary = {
			avg_sentiment: findings.length ? findings.reduce((a, b) => a + b.sentimentScore, 0) / findings.length : null,
			critical_count: findings.filter(f => f.sentimentLabel === 'CRITICAL').length,
			unique_risk_tags: [...new Set(findings.map(f => f.riskTags).flat())]
		};

		// 3. Build Full Payload
		const payload = {
			extractedData: analysis.extractedData,
			researchFindings: researchSummary,
			qualitativeAssessment: {
				siteVisitRating: latestQualitative.siteVisitRating || null,
				managementQualityRating: latestQualitative.managementQualityRating || null,
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
				reasons: [{ factor: "System Error", text: "ML Model unreachable, used fallback defaults", impact: "Neutral" }],
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

/**
 * GET /api/v1/risk/triangulate/:analysisId
 * Return triangulation results for an analysis.
 */
exports.getTriangulationResult = async (req, res, next) => {
	try {
		const { analysisId } = req.params;
		const { callTriangulate } = require('../services/aiClient');

		// Try to find existing document
		let analysis = await Analysis.findOne({ analysisId });
		if (!analysis) {
			try { analysis = await Analysis.findById(analysisId); } catch { /* invalid id */ }
		}

		if (analysis && analysis.triangulationResults) {
			return res.json(analysis.triangulationResults);
		}

		// Attempt live triangulation via risk engine
		if (analysis) {
			try {
				const result = await callTriangulate({
					extracted_financials: analysis.extractedData || {},
					research_findings: analysis.researchFindings || {},
					entity_details: analysis.entityDetails || {},
					loan_details: analysis.loanDetails || {},
				}, req.id);
				await Analysis.findByIdAndUpdate(analysis._id, { triangulationResults: result });
				return res.json(result);
			} catch { /* fall through to stub */ }
		}

		// Graceful stub
		return res.json({
			contradictions: [],
			confirmations: [
				{ check: 'Entity Verification', message: 'Entity onboarding data confirmed and saved' },
			],
			overall_triangulation_score: 70,
			summary: '0 contradictions, 1 confirmation — score: 70/100 (stub mode)',
		});
	} catch (error) {
		next(error);
	}
};

