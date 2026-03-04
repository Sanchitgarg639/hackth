const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
	logger.error(`[${req.id || 'no-id'}] ${err.stack || err.message}`);

	// Multer file size error
	if (err.code === 'LIMIT_FILE_SIZE') {
		return res.status(413).json({
			error: { code: 'FILE_TOO_LARGE', message: 'File exceeds 20MB limit' }
		});
	}

	// Multer file type error
	if (err.message && err.message.includes('not allowed')) {
		return res.status(400).json({
			error: { code: 'INVALID_FILE_TYPE', message: err.message }
		});
	}

	const statusCode = err.status || err.statusCode || 500;
	res.status(statusCode).json({
		error: {
			code: err.code || 'INTERNAL_ERROR',
			message: err.message || 'An unexpected error occurred'
		}
	});
};

module.exports = { errorHandler };
