const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middlewares/errorHandler');
const uploadRoutes = require('./routes/uploadRoutes');
const analysisRoutes = require('./routes/analysisRoutes');
const riskRoutes = require('./routes/riskRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/upload', uploadRoutes); // POST /api/upload
app.use('/api/analyze', analysisRoutes); // POST /api/analyze/:companyId
app.use('/api/risk', riskRoutes); // GET /api/risk/:companyId
app.use('/api/cam', reportRoutes); // GET /api/cam/:companyId

app.use(errorHandler);

module.exports = app;
