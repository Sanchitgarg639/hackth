import axios from 'axios';

const api = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
});

export const uploadFile = (file, companyName, sector) => {
	const formData = new FormData();
	formData.append('file', file);
	formData.append('companyName', companyName);
	formData.append('sector', sector);
	return api.post('/upload', formData);
};

export const analyzeCompany = (companyId, note) => {
	return api.post(`/analyze/${companyId}`, { note });
};

export const getRiskScore = (companyId) => {
	return api.get(`/risk/${companyId}`);
};

export const downloadCAM = (companyId) => {
	return api.get(`/cam/${companyId}`, { responseType: 'blob' });
};
