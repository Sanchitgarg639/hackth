const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
	type: { type: String, default: '' },
	filename: { type: String, default: '' },
	filePath: { type: String, default: '' },
	schema: { type: mongoose.Schema.Types.Mixed, default: [] },
	extractedData: { type: mongoose.Schema.Types.Mixed, default: {} },
	userOverrides: { type: mongoose.Schema.Types.Mixed, default: {} },
	approvalStatus: {
		type: String,
		enum: ['pending', 'confirmed', 'rejected', 'extracted', 'approved'],
		default: 'pending'
	},
	classificationResult: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

const analysisSchema = new mongoose.Schema({
	analysisId: { type: String, unique: true, sparse: true },
	fileRefs: [{ type: String }],
	companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
	// Stage 1: Onboarding
	entityDetails: { type: mongoose.Schema.Types.Mixed, default: null },
	loanDetails: { type: mongoose.Schema.Types.Mixed, default: null },
	// Stage 2 & 3: Documents
	documents: [documentSchema],
	// Existing fields
	extractedData: { type: mongoose.Schema.Types.Mixed, default: {} },
	researchFindings: { type: mongoose.Schema.Types.Mixed, default: {} },
	riskScore: { type: Number, default: null },
	riskDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
	camUrl: { type: String, default: null },
	camSummary: { type: mongoose.Schema.Types.Mixed, default: {} },
	// Stage 4: New analysis results
	triangulationResults: { type: mongoose.Schema.Types.Mixed, default: null },
	swotAnalysis: { type: mongoose.Schema.Types.Mixed, default: null },
	reasoningBreakdown: { type: mongoose.Schema.Types.Mixed, default: null },
	finalDecision: { type: mongoose.Schema.Types.Mixed, default: null },
	status: {
		type: String,
		enum: ['onboarded', 'queued', 'classifying', 'extracting', 'researching', 'scoring', 'generating', 'complete', 'failed'],
		default: 'queued'
	},
}, { timestamps: true });

module.exports = mongoose.model('Analysis', analysisSchema);
