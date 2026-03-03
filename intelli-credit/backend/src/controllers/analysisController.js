const { getResearch } = require('../services/researchService');
const { calculateRisk } = require('../services/riskService');
const Company = require('../models/Company');
const Financial = require('../models/Financial');
const ResearchFinding = require('../models/ResearchFinding');
const RiskAnalysis = require('../models/RiskAnalysis');

exports.analyzeCompany = async (req, res, next) => {
	try {
		const { companyId } = req.params;
		const { note } = req.body;

		const company = await Company.findById(companyId);
		if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

		const financial = await Financial.findOne({ companyId });
		if (!financial) return res.status(400).json({ success: false, message: 'No financial data for company' });

		// 1. Research Agent
		const researchData = await getResearch(company.name, note);
		const research = new ResearchFinding({ companyId, ...researchData });
		await research.save();

		// 2. Risk Engine
		const riskData = await calculateRisk(financial.toObject(), researchData);
		const riskAnalysis = new RiskAnalysis({ companyId, ...riskData });
		await riskAnalysis.save();

		res.status(200).json({
			success: true,
			riskAnalysis
		});
	} catch (error) {
		next(error);
	}
};

exports.getRiskScore = async (req, res, next) => {
	try {
		const { companyId } = req.params;
		const riskAnalysis = await RiskAnalysis.findOne({ companyId });
		if (!riskAnalysis) return res.status(404).json({ success: false, message: 'Risk data not found' });
		res.status(200).json({ success: true, data: riskAnalysis });
	} catch (error) {
		next(error);
	}
};
