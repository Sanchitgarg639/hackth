const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
	fileRefs: [{ type: String }],
	companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
	extractedData: { type: mongoose.Schema.Types.Mixed, default: {} },
	researchFindings: { type: mongoose.Schema.Types.Mixed, default: {} },
	riskScore: { type: Number, default: null },
	riskDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
	camUrl: { type: String, default: null },
	camSummary: { type: mongoose.Schema.Types.Mixed, default: {} },
	status: {
		type: String,
		enum: ['queued', 'extracting', 'researching', 'scoring', 'generating', 'complete', 'failed'],
		default: 'queued'
	},
}, { timestamps: true });

module.exports = mongoose.model('Analysis', analysisSchema);
