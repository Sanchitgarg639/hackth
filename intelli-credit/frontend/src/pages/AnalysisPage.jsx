import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCredit } from '../context/CreditContext';
import { analyzeCompany } from '../api/creditApi';
import ExtractedDataView from '../components/ExtractedDataView';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AnalysisPage() {
	const { companyId, extractedData, setRiskData } = useCredit();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [note, setNote] = useState('');
	const navigate = useNavigate();

	if (!companyId) {
		navigate('/');
		return null;
	}

	const handleAnalyze = async () => {
		setLoading(true);
		setError('');
		try {
			const res = await analyzeCompany(companyId, note);
			setRiskData(res.data.riskAnalysis);
			navigate('/report');
		} catch (err) {
			setError('Analysis failed');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div>
			<h2>Data Analysis</h2>
			{error && <p style={{ color: 'red' }}>{error}</p>}
			<ExtractedDataView data={extractedData} />

			<div style={{ marginTop: '20px' }}>
				<h3>Additional Research Notes</h3>
				<textarea
					rows={4}
					cols={50}
					value={note}
					onChange={(e) => setNote(e.target.value)}
					placeholder="Enter any qualitative notes..."
				/>
				<br />
				<button onClick={handleAnalyze} disabled={loading}>
					{loading ? 'Analyzing...' : 'Run Risk Analysis'}
				</button>
			</div>
			{loading && <LoadingSpinner message="Running AI models..." />}
		</div>
	);
}
