const axios = require('axios');
const env = require('../config/env');
const FormData = require('form-data');
const fs = require('fs');

exports.extractData = async (filePath) => {
	const form = new FormData();
	form.append('file', fs.createReadStream(filePath));

	const response = await axios.post(`${env.EXTRACTION_SERVICE_URL}/extract`, form, {
		headers: form.getHeaders(),
		timeout: 30000
	});
	return response.data;
};
