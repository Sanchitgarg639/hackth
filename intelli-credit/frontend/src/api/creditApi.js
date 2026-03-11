import axios from 'axios';

const api = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
	timeout: 60000,
});

// ── X-Analysis-ID Header Interceptor ─────────────────
let _analysisId = null;
export const setAnalysisIdHeader = (id) => { _analysisId = id; };

api.interceptors.request.use((config) => {
	if (_analysisId) {
		config.headers['X-Analysis-ID'] = _analysisId;
	}
	return config;
});

// ── Onboard ─────────────────────────────────────────
export const createOnboarding = (entityDetails, loanDetails) => {
	return api.post('/api/v1/onboard', { entityDetails, loanDetails });
};

// ── Upload ──────────────────────────────────────────
export const uploadFile = (files, companyName, sector, gstin, pan) => {
	const formData = new FormData();
	files.forEach(f => formData.append('files', f));
	formData.append('companyName', companyName);
	formData.append('sector', sector);
	if (gstin) formData.append('gstin', gstin);
	if (pan) formData.append('pan', pan);
	return api.post('/api/v1/upload', formData);
};

export const getUploadById = (fileId) => {
	return api.get(`/api/v1/upload/${fileId}`);
};

// ── Classify ────────────────────────────────────────
export const classifyDocument = (file) => {
	const formData = new FormData();
	formData.append('files', file);
	return api.post('/api/v1/classify', formData);
};

// ── Analysis ────────────────────────────────────────
export const startAnalysis = (fileId, companyId, analysisId) => {
	return api.post('/api/v1/analyze', { fileId, companyId, analysisId });
};

export const getAnalysisResult = (analysisId) => {
	return api.get(`/api/v1/analyze/${analysisId}`);
};

// ── Risk ────────────────────────────────────────────
export const getRiskScore = (companyId) => {
	return api.get(`/api/v1/risk/${companyId}`);
};
export const computeRiskScore = (companyId, manualInputs = {}) => {
	return api.post('/api/v1/risk/score', { companyId, manualInputs });
};

// ── Report ──────────────────────────────────────────
export const getReport = (analysisId) => {
	return api.get(`/api/v1/report/${analysisId}`);
};
export const generateReport = (analysisId) => {
	return api.post('/api/v1/report/generate', { analysisId });
};

// ── System Health ───────────────────────────────────
export const getSystemHealth = () => {
	return api.get('/system/health');
};

// ── Research ─────────────────────────────────────────
export const startResearch = (companyId) => {
	return api.post('/api/v1/research', { companyId });
};

export const getResearchFindings = (companyId) => {
	return api.get(`/api/v1/research/${companyId}`);
};

// ── Qualitative ──────────────────────────────────────
export const storeQualitativeInput = (companyId, data) => {
	return api.post('/api/v1/qualitative', { companyId, ...data });
};

export const getQualitativeInput = (companyId) => {
	return api.get(`/api/v1/qualitative/${companyId}`);
};

// ── Pipeline Status ──────────────────────────────────
export const getPipelineStatus = (analysisId) => {
	return api.get(`/api/v1/pipeline-status/${analysisId}`);
};

// ── Extraction Status ────────────────────────────────
export const getExtractionStatus = (analysisId) => {
	return api.get(`/api/v1/pipeline-status/${analysisId}`);
};

// ── Triangulation ────────────────────────────────────
export const getTriangulation = (analysisId) => {
	return api.get(`/api/v1/risk/triangulate/${analysisId}`);
};

// ── SWOT ──────────────────────────────────────────────
export const getSwot = (analysisId) => {
	return api.get(`/api/v1/report/swot/${analysisId}`);
};

// ── Downloads ────────────────────────────────────────
export const downloadXlsx = (analysisId) => {
	return api.get(`/api/v1/report/xlsx/${analysisId}`, { responseType: 'blob' });
};

export const downloadTriangulationPdf = (analysisId) => {
	return api.get(`/api/v1/report/triangulation-pdf/${analysisId}`, { responseType: 'blob' });
};

export default api;
