import { Routes, Route, Navigate } from 'react-router-dom';
import UploadPage from '../pages/UploadPage';
import AnalysisPage from '../pages/AnalysisPage';
import ReportPage from '../pages/ReportPage';

export default function AppRoutes() {
	return (
		<Routes>
			<Route path="/" element={<UploadPage />} />
			<Route path="/analyze" element={<AnalysisPage />} />
			<Route path="/report" element={<ReportPage />} />
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}
