const ResearchFinding = require('../models/ResearchFinding');
const Company = require('../models/Company');
const Analysis = require('../models/Analysis');
const { callResearch } = require('../services/aiClient');
const { logger } = require('../utils/logger');

/**
 * POST /api/v1/research
 * Trigger the Research Agent for a specific company and store results.
 */
exports.runResearch = async (req, res, next) => {
	try {
		const { companyId } = req.body;
		if (!companyId) {
			return res.status(400).json({ error: { code: 'MISSING_COMPANY', message: 'companyId is required' } });
		}

		const company = await Company.findById(companyId);
		if (!company) {
			return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Company not found' } });
		}

		logger.info(`[${req.id}] Triggering Research Agent for ${company.name}`);

		let researchData;
		try {
			// Call the internal FastAPI research service
			researchData = await callResearch(company.name, company.gstin, req.id);
		} catch (error) {
			logger.error(`[${req.id}] Research Agent failed: ${error.message}`);
			return res.status(502).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Research Agent is down' } });
		}

		// Delete old findings to keep data fresh (upsert strategy)
		await ResearchFinding.deleteMany({ companyId });

		const findings = researchData.findings || [];
		if (findings.length > 0) {
			// Attach companyId and save bulk
			const findingsDocs = findings.map(f => ({
				companyId,
				title: f.title,
				source: f.source,
				url: f.url,
				publishedDate: f.published_date,
				sentimentScore: f.sentiment_score,
				sentimentLabel: f.sentiment_label,
				riskTags: f.risk_tags,
				snippet: f.snippet,
			}));
			await ResearchFinding.insertMany(findingsDocs);
			logger.info(`[${req.id}] Saved ${findingsDocs.length} research findings for ${company.name}`);
		}

		// Also update the active Analysis if exists
		const latestAnalysis = await Analysis.findOne({ companyId }).sort({ createdAt: -1 });
		if (latestAnalysis) {
			latestAnalysis.researchFindings = researchData.summary || {};
			await latestAnalysis.save();
		}

		res.status(200).json({
			companyId,
			summary: researchData.summary || {},
			findingsCount: findings.length,
			status: 'completed'
		});

	} catch (error) {
		next(error);
	}
};

/**
 * GET /api/v1/research/:companyId
 * Get all stored research findings for a company.
 */
exports.getResearchFindings = async (req, res, next) => {
	try {
		const { companyId } = req.params;
		const findings = await ResearchFinding.find({ companyId }).sort({ sentimentScore: 1 }); // Lowest score (highest risk) first
		
		const criticalCount = findings.filter(f => f.sentimentLabel === 'CRITICAL').length;
		const negativeCount = findings.filter(f => f.sentimentLabel === 'NEGATIVE').length;
		
		const allTags = findings.reduce((acc, f) => acc.concat(f.riskTags), []);
		const tagsCount = allTags.reduce((acc, tag) => {
			acc[tag] = (acc[tag] || 0) + 1;
			return acc;
		}, {});

		res.status(200).json({
			companyId,
			total: findings.length,
			summary: {
				criticalCount,
				negativeCount,
				tagsCount
			},
			findings
		});
	} catch (error) {
		next(error);
	}
};
