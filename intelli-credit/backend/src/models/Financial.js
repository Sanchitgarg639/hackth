const mongoose = require('mongoose');

const financialSchema = new mongoose.Schema({
	companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
	period: { type: String, default: 'FY2024' },
	// Core financials
	revenue: Number,
	pat: Number,
	ebitda: Number,
	netWorth: Number,
	totalDebt: Number,
	totalAssets: Number,
	totalLiabilities: Number,
	currentAssets: Number,
	currentLiabilities: Number,
	interestExpense: Number,
	depreciation: Number,
	// Legacy fields (backward compat)
	netProfit: Number,
	liabilities: Number,
	gstTurnover: Number,
	bankTurnover: Number,
	// Ratios (computed by extraction service)
	ratios: {
		debtEquity: Number,
		currentRatio: Number,
		dscr: Number,
		interestCoverage: Number,
		debtToAssets: Number,
		returnOnEquity: Number,
		netProfitMargin: Number,
	},
	// CIBIL
	cibilScore: Number,
	cibilBand: String,
	// GST Analysis
	gstAnalysis: { type: mongoose.Schema.Types.Mixed, default: {} },
	// Bank Analysis
	bankAnalysis: { type: mongoose.Schema.Types.Mixed, default: {} },
	// Cross-verification
	crossVerification: { type: mongoose.Schema.Types.Mixed, default: {} },
	// Red flags
	redFlags: [{ type: mongoose.Schema.Types.Mixed }],
}, { timestamps: true });

module.exports = mongoose.model('Financial', financialSchema);
