const { callClassify } = require('../services/aiClient');
const { logger } = require('../utils/logger');

/**
 * POST /api/v1/classify
 * Accept a file upload, proxy to extraction-service /classify
 */
exports.classifyDocument = async (req, res, next) => {
	try {
		if (!req.files || req.files.length === 0) {
			return res.status(400).json({
				error: { code: 'NO_FILE', message: 'No file uploaded for classification' }
			});
		}

		const file = req.files[0];
		const analysisId = req.headers['x-analysis-id'] || req.body.analysisId || '';

		const result = await callClassify(file, analysisId, req.id);

		logger.info(`[${req.id}] Classification: ${file.originalname} → ${result.predicted_type} (${result.confidence}%)`);

		res.json(result);
	} catch (error) {
		logger.error(`Classification failed: ${error.message}`);
		// Return heuristic fallback on error
		const file = req.files?.[0];
		res.json({
			predicted_type: 'Unknown',
			confidence: 30,
			reasoning: 'Classification service unavailable — heuristic fallback',
			suggested_schema: [],
			filename: file?.originalname || 'unknown',
		});
	}
};
