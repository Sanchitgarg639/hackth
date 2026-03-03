const app = require('./app');
const { connectDB } = require('./config/db');
const env = require('./config/env');
const { logger } = require('./utils/logger');

const startServer = async () => {
	try {
		await connectDB();
		app.listen(env.PORT, () => {
			logger.info(`Backend server running on port ${env.PORT}`);
		});
	} catch (error) {
		logger.error('Failed to start server:', error);
		process.exit(1);
	}
};

startServer();
