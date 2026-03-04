const QualitativeAssessment = require('../models/QualitativeAssessment');
const Company = require('../models/Company');
const { logger } = require('../utils/logger');

/**
 * POST /api/v1/qualitative
 * Store manual credit officer inputs, site visit ratings, management quality.
 */
exports.storeQualitativeInput = async (req, res, next) => {
	try {
		const { companyId, notes, siteVisitRating, managementQualityRating } = req.body;
		
		if (!companyId || !notes) {
			return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'companyId and notes are required' } });
		}

		const company = await Company.findById(companyId);
		if (!company) {
			return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Company not found' } });
		}

		// Upsert logic for a basic Phase 3 (one active assessment per company)
		let assessment = await QualitativeAssessment.findOne({ companyId });
		if (!assessment) {
			assessment = new QualitativeAssessment({ companyId });
		}
		
		assessment.notes = notes;
		if (siteVisitRating) assessment.siteVisitRating = siteVisitRating;
		if (managementQualityRating) assessment.managementQualityRating = managementQualityRating;
		
		await assessment.save();
		
		logger.info(`[${req.id}] Stored qualitative assessment for ${company.name}`);

		res.status(200).json({
			message: "Qualitative assessment stored successfully",
			assessment
		});

	} catch (error) {
		next(error);
	}
};

/**
 * GET /api/v1/qualitative/:companyId
 * Get stored qualitative assessment.
 */
exports.getQualitativeInput = async (req, res, next) => {
	try {
		const { companyId } = req.params;
		const assessment = await QualitativeAssessment.findOne({ companyId });
		
		if (!assessment) {
			return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No qualitative assessment found' } });
		}

		res.status(200).json(assessment);
	} catch (error) {
		next(error);
	}
};
