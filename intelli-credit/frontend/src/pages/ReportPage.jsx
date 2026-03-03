import { useCredit } from '../context/CreditContext';
import { useNavigate } from 'react-router-dom';
import RiskDashboard from '../components/RiskDashboard';
import CAMPreview from '../components/CAMPreview';

export default function ReportPage() {
	const { companyId, riskData } = useCredit();
	const navigate = useNavigate();

	if (!companyId || !riskData) {
		navigate('/');
		return null;
	}

	return (
		<div>
			<h2>Final Risk Report</h2>
			<RiskDashboard riskData={riskData} />
			<hr />
			<CAMPreview companyId={companyId} />
			<button onClick={() => navigate('/')} style={{ marginTop: '20px' }}>Start Over</button>
		</div>
	);
}
