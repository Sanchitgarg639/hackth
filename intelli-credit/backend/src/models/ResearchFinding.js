const mongoose = require('mongoose');

const researchFindingSchema = new mongoose.Schema({
	companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
	title: { type: String, required: true },
	source: { type: String },
	url: { type: String },
	publishedDate: { type: String },
	sentimentScore: { type: Number, default: 0 },
	sentimentLabel: { type: String, enum: ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'CRITICAL'], default: 'NEUTRAL' },
	riskTags: [{ type: String }],
	snippet: { type: String }
}, { timestamps: true });

// Add index to query easily by companyId and sort by risk
researchFindingSchema.index({ companyId: 1, sentimentScore: 1 });

module.exports = mongoose.model('ResearchFinding', researchFindingSchema);
