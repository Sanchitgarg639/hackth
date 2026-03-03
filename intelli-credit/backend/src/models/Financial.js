const mongoose = require('mongoose');

const financialSchema = new mongoose.Schema({
	companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
	revenue: Number,
	netProfit: Number,
	liabilities: Number,
	gstTurnover: Number
}, { timestamps: true });

module.exports = mongoose.model('Financial', financialSchema);
