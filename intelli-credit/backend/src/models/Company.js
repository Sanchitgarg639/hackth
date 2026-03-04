const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
	name: { type: String, required: true },
	sector: { type: String, default: 'General' },
	gstin: { type: String, default: '' },
	pan: { type: String, default: '' },
	address: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
