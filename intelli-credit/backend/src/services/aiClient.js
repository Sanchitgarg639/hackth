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
		timeout: 30000,
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

const _headers = (requestId, analysisId) => ({
	'x-request-id': requestId || '',
	'x-analysis-id': analysisId || '',
});

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
 * Call classify endpoint on extraction service
 */
const callClassify = async (file, analysisId, requestId) => {
	return withRetry(async () => {
		const form = new FormData();
		form.append('file', fs.createReadStream(file.path), {
			filename: file.originalname,
			contentType: file.mimetype,
		});
		form.append('analysis_id', analysisId || '');

		const response = await extractionClient.post('/classify', form, {
			headers: {
				...form.getHeaders(),
				..._headers(requestId, analysisId),
			},
		});
		return response.data;
	});
};

/**
 * Call schema-aware extraction
 */
const callSchemaExtraction = async (file, schema, analysisId, requestId) => {
	return withRetry(async () => {
		const form = new FormData();
		form.append('file', fs.createReadStream(file.path), {
			filename: file.originalname,
			contentType: file.mimetype,
		});
		form.append('schema', JSON.stringify(schema));
		form.append('analysis_id', analysisId || '');

		const response = await extractionClient.post('/extract', form, {
			headers: {
				...form.getHeaders(),
				..._headers(requestId, analysisId),
			},
			timeout: 60000,
		});
		return response.data;
	});
};

/**
 * Call research agent
 */
const callResearch = async (companyName, gstin, requestId, sector) => {
	return withRetry(async () => {
		const response = await researchClient.post('/research', {
			companyName,
			sector: sector || '',
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
 * Call triangulation endpoint on risk engine
 */
const callTriangulate = async (payload, requestId) => {
	return withRetry(async () => {
		const response = await riskClient.post('/triangulate', payload, {
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
 * Call SWOT generator
 */
const callSwot = async (payload, requestId) => {
	return withRetry(async () => {
		const response = await camClient.post('/generate-swot', payload, {
			headers: { 'x-request-id': requestId || '' },
		});
		return response.data;
	});
};

/**
 * Call XLSX export
 */
const callXlsx = async (payload, requestId) => {
	return withRetry(async () => {
		const response = await camClient.post('/generate-xlsx', payload, {
			headers: { 'x-request-id': requestId || '' },
			responseType: 'stream',
		});
		return response;
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
	callClassify,
	callSchemaExtraction,
	callResearch,
	callRisk,
	callTriangulate,
	callCAM,
	callSwot,
	callXlsx,
	callGenerateXlsx: callXlsx, // alias used by reportController
	checkAllHealth,
};
