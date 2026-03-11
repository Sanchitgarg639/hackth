'use strict';
const Analysis = require('../models/Analysis');
const { callCAM, callSwot, callGenerateXlsx } = require('../services/aiClient');
const QualitativeAssessment = require('../models/QualitativeAssessment');

/** Helper: find analysis by UUID string OR MongoDB _id */
async function findAnalysis(id, populate) {
	let q = Analysis.findOne({ analysisId: id });
	if (populate) q = q.populate('companyId');
	let doc = await q;
	if (!doc) {
		try {
			q = Analysis.findById(id);
			if (populate) q = q.populate('companyId');
			doc = await q;
		} catch { /* invalid ObjectId — ignore */ }
	}
	return doc;
}

/**
 * GET /api/v1/report/:analysisId
 */
exports.getReport = async (req, res, next) => {
	try {
		const analysis = await findAnalysis(req.params.analysisId, true);
		if (!analysis) {
			return res.status(404).json({ error: { code: 'ANALYSIS_NOT_FOUND', message: 'Analysis not found' } });
		}
		if (analysis.status !== 'complete') {
			return res.status(409).json({
				error: { code: 'ANALYSIS_INCOMPLETE', message: `Analysis is still ${analysis.status}. Wait for completion.` }
			});
		}
		res.json({
			analysisId: analysis.analysisId || analysis._id,
			companyName: analysis.companyId?.name || analysis.entityDetails?.companyName || 'Unknown',
			camUrl: analysis.camUrl || '/static/sample-cam.pdf',
			summary: analysis.camSummary || {
				fiveCs: { character: 'Stable', capacity: 'Adequate', capital: 'Moderate', collateral: 'Partial', conditions: 'Watchlist' },
				recommendation: 'PROVISIONAL',
			},
			riskScore: analysis.riskScore,
			riskDetails: analysis.riskDetails,
			extractedData: analysis.extractedData,
			researchFindings: analysis.researchFindings,
			triangulationResults: analysis.triangulationResults,
			swotAnalysis: analysis.swotAnalysis,
			reasoningBreakdown: analysis.reasoningBreakdown,
			entityDetails: analysis.entityDetails,
			loanDetails: analysis.loanDetails,
		});
	} catch (error) { next(error); }
};

/**
 * POST /api/v1/report/generate
 */
exports.generateReport = async (req, res, next) => {
	try {
		const { analysisId } = req.body;
		if (!analysisId) return res.status(400).json({ error: { message: 'analysisId is required' } });

		const analysis = await findAnalysis(analysisId, true);
		if (!analysis) return res.status(400).json({ error: { message: 'Analysis not found.' } });

		const qualitative = await QualitativeAssessment.findOne({ companyId: analysis.companyId?._id }).sort({ createdAt: -1 }) || {};
		const payload = {
			companyData: analysis.companyId ? analysis.companyId.toObject() : { name: analysis.entityDetails?.companyName || 'Company' },
			extractedData: analysis.extractedData,
			researchFindings: analysis.researchFindings || {},
			qualitativeAssessment: {
				siteVisitRating: qualitative.siteVisitRating || 3,
				managementQualityRating: qualitative.managementQualityRating || 3,
				notes: qualitative.notes || ''
			},
			riskAnalysis: analysis.riskDetails,
		};

		let camResult;
		try {
			camResult = await callCAM(payload, req.id);
		} catch (error) {
			return res.status(502).json({ error: { message: `CAM Generator failed: ${error.message}` } });
		}

		analysis.camUrl = camResult.docxUrl || camResult.pdfUrl || camResult.downloadUrl || '/static/sample-cam.pdf';
		await analysis.save();

		res.status(200).json({ analysisId, camUrl: analysis.camUrl, downloadUrl: analysis.camUrl, filename: camResult.filename });
	} catch (error) { next(error); }
};

/**
 * GET /api/v1/report/swot/:analysisId
 */
exports.getSwot = async (req, res, next) => {
	try {
		const { analysisId } = req.params;
		const analysis = await findAnalysis(analysisId, false);

		if (analysis && analysis.swotAnalysis) {
			return res.json(analysis.swotAnalysis);
		}

		// Try AI service
		if (analysis) {
			try {
				const swotResult = await callSwot({
					company_name: analysis.entityDetails?.companyName || 'Company',
					sector: analysis.entityDetails?.sector || '',
					extracted_financials: analysis.extractedData || {},
					research_findings: analysis.researchFindings || {},
					risk_scores: analysis.riskDetails || {},
					loan_details: analysis.loanDetails || {},
				}, req.headers['x-analysis-id'] || analysisId);
				await Analysis.findByIdAndUpdate(analysis._id, { swotAnalysis: swotResult });
				return res.json(swotResult);
			} catch { /* fall through to stub */ }
		}

		// Graceful stub (no crash in stub mode)
		return res.json({
			status: 'stub',
			swot: {
				strengths: [{ point: 'Established entity with operational track record', data_ref: 'Entity verified' }],
				weaknesses: [{ point: 'Financial data pending full extraction', data_ref: 'Extraction in progress' }],
				opportunities: [{ point: 'Sector growth aligned with loan purpose', data_ref: 'Sector research' }],
				threats: [{ point: 'Regulatory changes may impact credit norms', data_ref: 'RBI guidelines 2025' }],
			},
			company: analysis?.entityDetails?.companyName || 'Company',
			source: 'heuristic',
		});
	} catch (error) { next(error); }
};

/**
 * GET /api/v1/report/xlsx/:analysisId
 */
exports.downloadXlsx = async (req, res, next) => {
	try {
		const { analysisId } = req.params;
		const analysis = await findAnalysis(analysisId, false);

		try {
			const xlsxResponse = await callGenerateXlsx({
				company_name: analysis?.entityDetails?.companyName || 'Company',
				analysis_id: analysisId,
				documents: analysis?.documents || [],
				risk_scores: analysis?.riskDetails || {},
				swot: analysis?.swotAnalysis?.swot || {},
			}, analysisId);

			res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
			res.setHeader('Content-Disposition', `attachment; filename="IntelliCredit_Report_${analysisId}.xlsx"`);
			return res.send(Buffer.from(xlsxResponse.data));
		} catch {
			// CSV fallback — no crash
			const csv = [
				'Entity,Risk Score,Grade,Decision',
				`${analysis?.entityDetails?.companyName || 'Company'},${analysis?.riskScore || 'N/A'},${analysis?.riskDetails?.grade || 'N/A'},${analysis?.riskDetails?.decision || 'N/A'}`,
			].join('\n');
			res.setHeader('Content-Type', 'text/csv');
			res.setHeader('Content-Disposition', `attachment; filename="IntelliCredit_Summary_${analysisId}.csv"`);
			return res.send(csv);
		}
	} catch (error) { next(error); }
};

/**
 * GET /api/v1/report/triangulation-pdf/:analysisId
 */
exports.downloadTriangulationPdf = async (req, res, next) => {
	try {
		const { analysisId } = req.params;
		const analysis = await findAnalysis(analysisId, false);

		const tri = analysis?.triangulationResults || {
			contradictions: [],
			confirmations: [{ check: 'No data', message: 'Run analysis first to populate triangulation results' }],
			overall_triangulation_score: null,
		};

		const lines = [
			'INTELLI-CREDIT — Triangulation Report',
			`Entity: ${analysis?.entityDetails?.companyName || 'N/A'}`,
			`Analysis ID: ${analysisId}`,
			`Generated: ${new Date().toISOString()}`,
			'',
			`Overall Consistency Score: ${tri.overall_triangulation_score ?? 'N/A'}/100`,
			'',
			'=== CONTRADICTIONS ===',
			...(tri.contradictions || []).map(c => `[${(c.severity || 'MEDIUM').toUpperCase()}] ${c.check}: ${c.flag}`),
			(tri.contradictions || []).length === 0 ? 'None identified.' : '',
			'',
			'=== CONFIRMATIONS ===',
			...(tri.confirmations || []).map(c => `[OK] ${c.check}: ${c.message}`),
			(tri.confirmations || []).length === 0 ? 'None identified.' : '',
			'',
			'--- End of Report ---',
		];

		res.setHeader('Content-Type', 'text/plain; charset=utf-8');
		res.setHeader('Content-Disposition', `attachment; filename="Triangulation_Report_${analysisId}.txt"`);
		return res.send(lines.join('\n'));
	} catch (error) { next(error); }
};
