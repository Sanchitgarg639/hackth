const mongoose = require('mongoose');

const researchFindingSchema = new mongoose.Schema({
	companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
	litigationFlag: Boolean,
	newsScore: Number,
	qualitativeAdjustment: Number
}, { timestamps: true });

module.exports = mongoose.model('ResearchFinding', researchFindingSchema);
