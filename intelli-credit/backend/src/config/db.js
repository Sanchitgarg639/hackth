const mongoose = require('mongoose');
const env = require('./env');
const { logger } = require('../utils/logger');

const connectDB = async () => {
	try {
		await mongoose.connect(env.MONGODB_URI);
		logger.info('MongoDB Connected');
	} catch (err) {
		logger.error('MongoDB Connection Error: ', err.message);
		process.exit(1);
	}
};

module.exports = { connectDB };
