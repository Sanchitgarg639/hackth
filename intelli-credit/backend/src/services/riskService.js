const axios = require('axios');
const env = require('../config/env');

exports.calculateRisk = async (financialData, researchData) => {
	const response = await axios.post(`${env.RISK_ENGINE_URL}/score`, {
		financial_data: financialData,
		research_data: researchData
	}, { timeout: 10000 });
	return response.data;
};
