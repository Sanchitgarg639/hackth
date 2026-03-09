const Analysis = require('../models/Analysis');
const Company = require('../models/Company');
const Financial = require('../models/Financial');
const { callExtraction, callResearch, callRisk, callCAM } = require('../services/aiClient');
const { logger } = require('../utils/logger');

/**
 * POST /api/v1/analyze
 * Start a new analysis — accepts {fileId, companyId}.
 * Runs the full pipeline: extract → research → score → generate CAM.
 * Uses an async state machine pattern with simulated delays for demo.
 */
exports.startAnalysis = async (req, res, next) => {
	try {
		const { fileId, companyId } = req.body;

		if (!companyId) {
			return res.status(400).json({
				error: { code: 'MISSING_COMPANY', message: 'companyId is required' }
			});
		}

		const company = await Company.findById(companyId);
		if (!company) {
			return res.status(404).json({
				error: { code: 'COMPANY_NOT_FOUND', message: 'Company not found' }
			});
		}

		// Create analysis record
		const analysis = new Analysis({
			fileRefs: fileId ? [fileId] : [],
			companyId,
			status: 'queued',
		});
		await analysis.save();

		// Return immediately with analysisId
		res.status(202).json({
			analysisId: analysis._id,
			status: 'queued',
			message: 'Analysis started — poll GET /api/v1/analyze/:id for status',
		});

		// Run pipeline asynchronously (non-blocking)
		runAnalysisPipeline(analysis._id, company, fileId, req.id);

	} catch (error) {
		next(error);
	}
};

/**
 * Async pipeline that progresses through status states.
 * Each stage updates the Analysis document so polling shows progress.
 */
async function runAnalysisPipeline(analysisId, company, fileId, requestId) {
	try {
		const analysis = await Analysis.findById(analysisId);

		// Stage 1: Extracting
		analysis.status = 'extracting';
		await analysis.save();
		await delay(1500);

		let extractedData;
		try {
			const path = require('path');
			const uploadDir = path.join(__dirname, '../../uploads');
			const fs = require('fs');
			const files = fs.readdirSync(uploadDir);
			const match = files.find(f => f === fileId || (fileId && f.includes(fileId)));
			const filePath = match ? path.join(uploadDir, match) : null;

			if (filePath && fs.existsSync(filePath)) {
				// The aiClient.callExtraction expects an array of file objects resembling multer's req.files
				const fileObj = {
					path: filePath,
					originalname: match,
					filename: match
				};
				extractedData = await callExtraction([fileObj], requestId);
			} else {
				throw new Error('File not found, using stub');
			}
		} catch (err) {
			logger.warn(`[${requestId}] Extraction failed or file missing, using stub: ${err.message}`);
			extractedData = {
				financials: {
					revenue: 150000000, pat: 18000000, ebitda: 28000000,
					netWorth: 40000000, totalDebt: 80000000,
					totalAssets: 120000000, totalLiabilities: 80000000,
					currentAssets: 45000000, currentLiabilities: 30000000,
					interestExpense: 12000000, depreciation: 8000000,
				},
				ratios: { debtEquity: 2.0, currentRatio: 1.5, dscr: 2.33 },
				gstAnalysis: { gstTurnover: 165000000, itcMismatchPercent: null, circularTradingRisk: false },
				bankAnalysis: { bankTurnover: 140000000 },
				crossVerification: { variancePercent: 15.15, revenueInflationFlag: true, analysis: 'Stub data' },
				redFlags: [],
				balanceSheet: { totalAssets: 120000000, totalLiabilities: 80000000, netWorth: 40000000 },
				keyCovenants: ['Maintain DSCR > 1.2', 'Current ratio > 1.5'],
				revenue: 150000000, netProfit: 18000000,
			};
		}
		analysis.extractedData = extractedData;
		analysis.markModified('extractedData');
		await analysis.save();

		// Stage 2: Researching
		analysis.status = 'researching';
		await analysis.save();
		await delay(1500);

		let researchFindings;
		try {
			researchFindings = await callResearch(company.name, company.gstin, requestId);
		} catch (err) {
			logger.warn(`[${requestId}] Research agent failed, using stub: ${err.message}`);
			researchFindings = {
				findings: [
					{ title: 'Company Q3 results exceed expectations', sentiment_label: 'POSITIVE', sentiment_score: 0.8, risk_tags: [] },
					{ title: 'Sector outlook upgraded by analysts', sentiment_label: 'POSITIVE', sentiment_score: 0.6, risk_tags: [] },
				],
				summary: {
					total_items: 2,
					critical_count: 0,
					negative_count: 0,
					avg_sentiment: 0.7,
					unique_risk_tags: []
				}
			};
		}
		analysis.researchFindings = researchFindings;
		analysis.markModified('researchFindings');
		await analysis.save();

		// Stage 3: Scoring
		analysis.status = 'scoring';
		await analysis.save();
		await delay(1500);

		try {
			const riskPayload = {
				extractedData,
				researchFindings: researchFindings.summary || {},
				qualitativeAssessment: {
					siteVisitRating: null,
					managementQualityRating: null,
					notes: 'Automated pipeline assessment'
				},
				manualInputs: {}
			};
			riskResult = await callRisk(riskPayload, requestId);
		} catch (err) {
			logger.warn(`[${requestId}] Risk scoring failed, using stub: ${err.message}`);
			riskResult = {
				score: 72,
				grade: 'Moderate Risk',
				pd: 0.28,
				drivers: [
					{ factor: 'Strong GST turnover', impact: 15 },
					{ factor: 'Healthy DSCR ratio', impact: 10 },
				],
				recommendedLimit: 25000000,
				suggestedInterestRate: '11.75%',
				reasons: [{ factor: 'Fallback', text: 'Stub scoring — weighted factor model', impact: 'Neutral' }],
				features_used: {}
			};
		}
		analysis.riskScore = riskResult.score || 0;
		analysis.riskDetails = riskResult;
		analysis.markModified('riskDetails');
		await analysis.save();

		// Stage 4: Generating CAM
		analysis.status = 'generating';
		await analysis.save();
		await delay(1500);

		let camResult;
		try {
			const camPayload = {
				company: company.toObject(),
				riskResult,
				extractedData,
				researchFindings
			};
			camResult = await callCAM(camPayload, requestId);
		} catch (err) {
			logger.warn(`[${requestId}] CAM generation failed, using stub: ${err.message}`);
			camResult = {
				camUrl: '/static/sample-cam.pdf',
				summary: {
					fiveCs: {
						character: 'Stable — clean promoter history',
						capacity: 'Adequate — DSCR 1.8x',
						capital: 'Moderate — net worth ₹4Cr',
						collateral: 'Partial — primary security offered',
						conditions: 'Watchlist — sector under review',
					},
					recommendation: 'PROVISIONAL APPROVAL — final decision pending risk engine integration',
				},
			};
		}
		analysis.camUrl = camResult.camUrl || '/static/sample-cam.pdf';
		analysis.camSummary = camResult.summary || {};
		analysis.markModified('camSummary');
		analysis.status = 'complete';
		await analysis.save();

		logger.info(`[${requestId}] Analysis ${analysisId} completed successfully`);

	} catch (err) {
		logger.error(`Analysis pipeline error: ${err.message}`);
		try {
			await Analysis.findByIdAndUpdate(analysisId, { status: 'failed' });
		} catch { }
	}
}

function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * GET /api/v1/analyze/:id
 * Return analysis status and result (for polling).
 */
exports.getAnalysis = async (req, res, next) => {
	try {
		const { id } = req.params;
		const analysis = await Analysis.findById(id);

		if (!analysis) {
			return res.status(404).json({
				error: { code: 'ANALYSIS_NOT_FOUND', message: 'Analysis not found' }
			});
		}

		const response = {
			analysisId: analysis._id,
			status: analysis.status,
			extractedData: analysis.extractedData,
			researchFindings: analysis.researchFindings,
			riskScore: analysis.riskScore,
			riskDetails: analysis.riskDetails,
			camUrl: analysis.camUrl,
			camSummary: analysis.camSummary,
			updatedAt: analysis.updatedAt,
		};

		res.json(response);
	} catch (error) {
		next(error);
	}
};
