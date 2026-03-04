const Analysis = require('../models/Analysis');

/**
 * GET /api/v1/report/:analysisId
 * Return CAM report summary and download link.
 */
exports.getReport = async (req, res, next) => {
	try {
		const { analysisId } = req.params;

		const analysis = await Analysis.findById(analysisId).populate('companyId');

		if (!analysis) {
			return res.status(404).json({
				error: { code: 'ANALYSIS_NOT_FOUND', message: 'Analysis not found' }
			});
		}

		if (analysis.status !== 'complete') {
			return res.status(409).json({
				error: {
					code: 'ANALYSIS_INCOMPLETE',
					message: `Analysis is still ${analysis.status}. Wait for completion.`
				}
			});
		}

		res.json({
			analysisId: analysis._id,
			companyName: analysis.companyId?.name || 'Unknown',
			camUrl: analysis.camUrl || '/static/sample-cam.pdf',
			summary: analysis.camSummary || {
				fiveCs: {
					character: 'Stable',
					capacity: 'Adequate',
					capital: 'Moderate',
					collateral: 'Partial',
					conditions: 'Watchlist',
				},
				recommendation: 'PROVISIONAL — pending risk engine integration',
			},
			riskScore: analysis.riskScore,
			riskDetails: analysis.riskDetails,
			extractedData: analysis.extractedData,
			researchFindings: analysis.researchFindings,
		});
	} catch (error) {
		next(error);
	}
};

/**
 * POST /api/v1/report/generate
 * Trigger the CAM document generation manually.
 */
const { callCAM } = require('../services/aiClient');
const QualitativeAssessment = require('../models/QualitativeAssessment');

exports.generateReport = async (req, res, next) => {
	try {
		const { analysisId } = req.body;
		if (!analysisId) return res.status(400).json({ error: { message: "analysisId is required" } });

		const analysis = await Analysis.findById(analysisId).populate('companyId');
		if (!analysis || !analysis.riskDetails) {
			return res.status(400).json({ error: { message: "Analysis or Risk details not found. Please run Risk Engine first." } });
		}

		const qualitative = await QualitativeAssessment.findOne({ companyId: analysis.companyId._id }).sort({ createdAt: -1 }) || {};

		const payload = {
			companyData: analysis.companyId.toObject(),
			extractedData: analysis.extractedData,
			researchFindings: analysis.researchFindings || {},
			qualitativeAssessment: {
				siteVisitRating: qualitative.siteVisitRating || 3,
				managementQualityRating: qualitative.managementQualityRating || 3,
				notes: qualitative.notes || ''
			},
			riskAnalysis: analysis.riskDetails
		};

		let camResult;
		try {
			camResult = await callCAM(payload, req.id);
		} catch (error) {
			return res.status(502).json({ error: { message: `CAM Generator failed: ${error.message}` } });
		}

		// Save the generated document URL
		analysis.camUrl = camResult.docxUrl || camResult.pdfUrl || '/static/sample-cam.pdf';
		await analysis.save();

		res.status(200).json({
			analysisId,
			camUrl: analysis.camUrl,
			filename: camResult.filename
		});
	} catch (error) {
		next(error);
	}
};
