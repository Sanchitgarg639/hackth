import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadFile } from '../api/creditApi';
import { useCredit } from '../context/CreditContext';
import FileUploader from '../components/FileUploader';
import LoadingSpinner from '../components/LoadingSpinner';

export default function UploadPage() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const navigate = useNavigate();
	const { setCompanyId, setExtractedData } = useCredit();

	const handleUpload = async (file, companyName, sector) => {
		setLoading(true);
		setError('');
		try {
			const res = await uploadFile(file, companyName, sector);
			setCompanyId(res.data.companyId);
			setExtractedData(res.data.extractedData);
			navigate('/analyze');
		} catch (err) {
			setError(err.response?.data?.message || err.message || 'Upload failed');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div>
			<h2>Upload Financial Documents</h2>
			{error && <p style={{ color: 'red' }}>{error}</p>}
			{loading ? <LoadingSpinner message="Extracting data..." /> : <FileUploader onUpload={handleUpload} />}
		</div>
	);
}
