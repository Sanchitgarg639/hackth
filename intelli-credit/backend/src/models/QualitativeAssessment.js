const mongoose = require('mongoose');

const qualitativeAssessmentSchema = new mongoose.Schema({
	companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
	officerName: { type: String, default: 'System user' }, // Hardcoded until Auth Phase
	notes: { type: String, required: true },
	siteVisitRating: { type: Number, min: 1, max: 5 },
	managementQualityRating: { type: Number, min: 1, max: 5 },
}, { timestamps: true });

qualitativeAssessmentSchema.index({ companyId: 1 });

module.exports = mongoose.model('QualitativeAssessment', qualitativeAssessmentSchema);
