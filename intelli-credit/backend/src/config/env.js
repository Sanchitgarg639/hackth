require('dotenv').config();

module.exports = {
	PORT: process.env.PORT || 5000,
	MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/intelli_credit',
	EXTRACTION_SERVICE_URL: process.env.EXTRACTION_SERVICE_URL || 'http://localhost:8000',
	RESEARCH_AGENT_URL: process.env.RESEARCH_AGENT_URL || 'http://localhost:8001',
	RISK_ENGINE_URL: process.env.RISK_ENGINE_URL || 'http://localhost:8002',
	CAM_GENERATOR_URL: process.env.CAM_GENERATOR_URL || 'http://localhost:8003',
};
