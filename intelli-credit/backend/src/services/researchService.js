const axios = require('axios');
const env = require('../config/env');

exports.getResearch = async (companyName, note) => {
	const response = await axios.post(`${env.RESEARCH_AGENT_URL}/research`, {
		company_name: companyName,
		qualitative_note: note || ''
	}, { timeout: 10000 });
	return response.data;
};
