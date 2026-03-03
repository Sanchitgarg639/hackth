const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
	name: { type: String, required: true },
	sector: { type: String, required: true },
	createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Company', companySchema);
