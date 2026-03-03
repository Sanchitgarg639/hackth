const axios = require('axios');
const env = require('../config/env');

exports.generateCam = async (companyData, riskAnalysis) => {
	const response = await axios.post(`${env.CAM_GENERATOR_URL}/generate`, {
		company_data: companyData,
		risk_analysis: riskAnalysis
	}, { responseType: 'stream', timeout: 30000 });
	return response.data;
};
