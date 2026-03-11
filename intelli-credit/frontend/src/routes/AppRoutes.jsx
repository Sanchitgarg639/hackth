import { Routes, Route, Navigate } from 'react-router-dom';
import OnboardingPage from '../pages/OnboardingPage';
import DocumentUploadPage from '../pages/DocumentUploadPage';
import ClassificationReviewPage from '../pages/ClassificationReviewPage';
import SchemaEditorPage from '../pages/SchemaEditorPage';
import ExtractionProgressPage from '../pages/ExtractionProgressPage';
import AnalysisPage from '../pages/AnalysisPage';
import ReportPage from '../pages/ReportPage';

export default function AppRoutes() {
	return (
		<Routes>
			<Route path="/" element={<OnboardingPage />} />
			<Route path="/upload" element={<DocumentUploadPage />} />
			<Route path="/classify" element={<ClassificationReviewPage />} />
			<Route path="/schema" element={<SchemaEditorPage />} />
			<Route path="/extract" element={<ExtractionProgressPage />} />
			<Route path="/analyze" element={<AnalysisPage />} />
			<Route path="/report" element={<ReportPage />} />
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}
