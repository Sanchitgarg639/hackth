const { v4: uuidv4 } = require('uuid');
const Analysis = require('../models/Analysis');
const { logger } = require('../utils/logger');

/**
 * POST /api/v1/onboard
 * Create a new analysis with entity + loan details.
 */
exports.createOnboarding = async (req, res, next) => {
	try {
		const { entityDetails, loanDetails } = req.body;

		if (!entityDetails || !entityDetails.companyName) {
			return res.status(400).json({
				error: { code: 'VALIDATION', message: 'Company name is required' }
			});
		}

		const analysisId = uuidv4();

		const analysis = new Analysis({
			analysisId,
			entityDetails: {
				companyName: entityDetails.companyName,
				cin: entityDetails.cin || '',
				pan: entityDetails.pan || '',
				gstin: entityDetails.gstin || '',
				sector: entityDetails.sector || '',
				subSector: entityDetails.subSector || '',
				annualTurnover: entityDetails.annualTurnover || 0,
				yearsInOperation: entityDetails.yearsInOperation || 0,
			},
			loanDetails: {
				loanType: loanDetails?.loanType || '',
				loanAmount: loanDetails?.loanAmount || 0,
				tenure: loanDetails?.tenure || 0,
				interestRate: loanDetails?.interestRate || 0,
				purpose: loanDetails?.purpose || '',
				collateral: loanDetails?.collateral || 'None',
			},
			status: 'onboarded',
		});

		await analysis.save();

		logger.info(`[${req.id}] Onboarding created: analysisId=${analysisId}, company=${entityDetails.companyName}`);

		res.status(201).json({
			analysisId,
			companyId: analysis._id,
			status: 'onboarded',
		});
	} catch (error) {
		next(error);
	}
};
