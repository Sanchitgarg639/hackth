const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { requestId } = require('./middlewares/requestId');
const { errorHandler } = require('./middlewares/errorHandler');
const uploadRoutes = require('./routes/uploadRoutes');
const analysisRoutes = require('./routes/analysisRoutes');
const riskRoutes = require('./routes/riskRoutes');
const reportRoutes = require('./routes/reportRoutes');
const researchRoutes = require('./routes/researchRoutes');
const qualitativeRoutes = require('./routes/qualitativeRoutes');
const { checkAllHealth } = require('./services/aiClient');
const env = require('./config/env');

const app = express();

// ─── Security ───────────────────────────────────────────
app.use(helmet());
app.use(cors({
	origin: env.FRONTEND_ORIGIN,
	credentials: true,
}));

// ─── Request ID & Logging ───────────────────────────────
app.use(requestId);
app.use(morgan(':method :url :status :response-time ms - :req[x-request-id]'));

// ─── Rate Limiting ──────────────────────────────────────
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: { code: 'RATE_LIMIT', message: 'Too many requests, try again later' } },
});
app.use(limiter);

// ─── Body Parsing ───────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static Files (for CAM downloads) ───────────────────
app.use('/static', express.static(path.join(__dirname, '../static')));

// ─── Health & Metrics ───────────────────────────────────
const startTime = Date.now();
let requestCount = 0;

app.use((req, res, next) => {
	requestCount++;
	next();
});

app.get('/health', (req, res) => {
	res.json({
		status: 'ok',
		uptime: Math.floor((Date.now() - startTime) / 1000),
		time: new Date().toISOString(),
		version: '1.0.0',
	});
});

app.get('/metrics', (req, res) => {
	res.json({
		uptime: Math.floor((Date.now() - startTime) / 1000),
		totalRequests: requestCount,
		time: new Date().toISOString(),
	});
});

app.get('/system/health', async (req, res) => {
	const aiHealth = await checkAllHealth();
	res.json({
		backend: 'ok',
		...aiHealth,
	});
});

// ─── API v1 Routes ──────────────────────────────────────
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/analyze', analysisRoutes);
app.use('/api/v1/risk', riskRoutes);
app.use('/api/v1/report', reportRoutes);
app.use('/api/v1/research', researchRoutes);
app.use('/api/v1/qualitative', qualitativeRoutes);

// ─── 404 Handler ────────────────────────────────────────
app.use((req, res) => {
	res.status(404).json({
		error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.url} not found` }
	});
});

// ─── Error Handler ──────────────────────────────────────
app.use(errorHandler);

module.exports = app;
