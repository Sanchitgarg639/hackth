const mongoose = require('mongoose');

const camReportSchema = new mongoose.Schema({
	companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
	filePath: String,
	generatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CAMReport', camReportSchema);
