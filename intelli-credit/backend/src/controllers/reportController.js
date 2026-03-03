const { generateCam } = require('../services/camService');
const Company = require('../models/Company');
const RiskAnalysis = require('../models/RiskAnalysis');

exports.generateAndDownloadCam = async (req, res, next) => {
	try {
		const { companyId } = req.params;

		const company = await Company.findById(companyId);
		const riskAnalysis = await RiskAnalysis.findOne({ companyId });

		if (!company || !riskAnalysis) {
			return res.status(404).json({ success: false, message: 'Data missing to generate CAM' });
		}

		// Call CAM generator service (returns stream)
		const pdfStream = await generateCam(company.toObject(), riskAnalysis.toObject());

		res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
		res.setHeader('Content-Disposition', `attachment; filename=CAM_Report_${companyId}.docx`);

		pdfStream.pipe(res);

	} catch (error) {
		next(error);
	}
};
