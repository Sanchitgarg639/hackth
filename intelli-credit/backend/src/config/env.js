require('dotenv').config();

module.exports = {
	PORT: process.env.PORT || 5000,
	MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/intelli_credit',
	EXTRACTION_SERVICE_URL: process.env.EXTRACTION_SERVICE_URL || 'http://localhost:8001',
	RESEARCH_AGENT_URL: process.env.RESEARCH_AGENT_URL || 'http://localhost:8002',
	RISK_ENGINE_URL: process.env.RISK_ENGINE_URL || 'http://localhost:8003',
	CAM_GENERATOR_URL: process.env.CAM_GENERATOR_URL || 'http://localhost:8004',
	JWT_SECRET: process.env.JWT_SECRET || 'dev-secret',
	MAX_UPLOAD_SIZE: parseInt(process.env.MAX_UPLOAD_SIZE) || 20 * 1024 * 1024, // 20MB
	FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
};
