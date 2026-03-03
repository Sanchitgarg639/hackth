const mongoose = require('mongoose');

const riskAnalysisSchema = new mongoose.Schema({
	companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
	finalScore: Number,
	breakdown: {
		financialScore: Number,
		litigationScore: Number,
		sectorScore: Number
	},
	decision: String,
	recommendedLimit: Number,
	interestRate: Number
}, { timestamps: true });

module.exports = mongoose.model('RiskAnalysis', riskAnalysisSchema);
