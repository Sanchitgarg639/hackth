const axios = require('axios');
const env = require('../config/env');
const { logger } = require('../utils/logger');
const fs = require('fs');
const FormData = require('form-data');

/**
 * AI Client wrapper with timeout, retries, and correlation ID forwarding.
 */

const createClient = (baseURL) => {
	return axios.create({
		baseURL,
		timeout: 15000,
	});
};

const withRetry = async (fn, retries = 2) => {
	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			return await fn();
		} catch (err) {
			if (attempt === retries) throw err;
			logger.warn(`Retry ${attempt + 1}/${retries} after error: ${err.message}`);
			await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
		}
	}
};

const extractionClient = createClient(env.EXTRACTION_SERVICE_URL);
const researchClient = createClient(env.RESEARCH_AGENT_URL);
const riskClient = createClient(env.RISK_ENGINE_URL);
const camClient = createClient(env.CAM_GENERATOR_URL);

/**
 * Call extraction service
 */
const callExtraction = async (files, requestId) => {
	return withRetry(async () => {
		const form = new FormData();
		files.forEach(file => {
			const name = file.originalname.toLowerCase();
			if (name.endsWith('.pdf')) {
				form.append('pdf_file', fs.createReadStream(file.path));
			} else if (name.includes('gst') || name.includes('3b') || name.includes('2a')) {
				form.append('gst_file', fs.createReadStream(file.path));
			} else if (name.includes('bank') || name.includes('statement')) {
				form.append('bank_file', fs.createReadStream(file.path));
			} else {
				form.append('pdf_file', fs.createReadStream(file.path));
			}
		});

		const response = await extractionClient.post('/extract-multi', form, {
			headers: {
				...form.getHeaders(),
				'x-request-id': requestId || '',
			},
		});
		return response.data;
	});
};

/**
 * Call research agent
 */
const callResearch = async (companyName, gstin, requestId) => {
	return withRetry(async () => {
		const response = await researchClient.post('/research', {
			companyName,
			sector: '', // Optional parameters as per Phase 3 definition
			gstin: gstin || '',
		}, {
			headers: { 'x-request-id': requestId || '' },
		});
		return response.data;
	});
};

/**
 * Call risk engine
 */
const callRisk = async (payload, requestId) => {
	return withRetry(async () => {
		const response = await riskClient.post('/score', payload, {
			headers: { 'x-request-id': requestId || '' },
		});
		return response.data;
	});
};

/**
 * Call CAM generator
 */
const callCAM = async (payload, requestId) => {
	return withRetry(async () => {
		const response = await camClient.post('/generate', payload, {
			headers: { 'x-request-id': requestId || '' },
		});
		return response.data;
	});
};

/**
 * Check health of all AI services
 */
const checkAllHealth = async () => {
	const services = [
		{ name: 'extraction', client: extractionClient },
		{ name: 'research', client: researchClient },
		{ name: 'risk', client: riskClient },
		{ name: 'cam', client: camClient },
	];

	const results = {};
	await Promise.all(services.map(async ({ name, client }) => {
		try {
			const res = await client.get('/health', { timeout: 3000 });
			results[name] = res.data.status || 'ok';
		} catch {
			results[name] = 'unreachable';
		}
	}));

	return results;
};

module.exports = {
	callExtraction,
	callResearch,
	callRisk,
	callCAM,
	checkAllHealth,
};
