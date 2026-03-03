const { extractData } = require('../services/extractionService');
const Company = require('../models/Company');
const Financial = require('../models/Financial');

exports.uploadDocument = async (req, res, next) => {
	try {
		if (!req.file) {
			return res.status(400).json({ success: false, message: 'No file uploaded' });
		}
		const { companyName, sector } = req.body;

		// 1. Save company
		const company = new Company({
			name: companyName || 'Unknown Company',
			sector: sector || 'General'
		});
		await company.save();

		// 2. Extract Data
		const extractedData = await extractData(req.file.path);

		// 3. Save Financials
		const financial = new Financial({
			companyId: company._id,
			...extractedData
		});
		await financial.save();

		res.status(200).json({
			success: true,
			message: 'File processed successfully',
			companyId: company._id,
			extractedData
		});
	} catch (error) {
		next(error);
	}
};
