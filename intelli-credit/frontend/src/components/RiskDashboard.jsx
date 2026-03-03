import { formatCurrency, formatPercentage } from '../utils/formatters';

export default function RiskDashboard({ riskData }) {
	if (!riskData) return null;

	const color = riskData.decision === 'APPROVE' ? 'green' : riskData.decision === 'REVIEW' ? 'orange' : 'red';

	return (
		<div style={{ padding: '20px', border: `2px solid ${color}` }}>
			<h3 style={{ color }}>Decision: {riskData.decision}</h3>
			<h2>Final Score: {riskData.finalScore}/100</h2>

			<h4>Score Breakdown:</h4>
			<ul>
				<li>Financials: {riskData.breakdown?.financialScore}</li>
				<li>Litigation/News: {riskData.breakdown?.litigationScore}</li>
				<li>Sector Risk: {riskData.breakdown?.sectorScore}</li>
			</ul>

			{riskData.decision === 'APPROVE' && (
				<div>
					<h4>Terms:</h4>
					<p>Recommended Limit: {formatCurrency(riskData.recommendedLimit)}</p>
					<p>Interest Rate: {formatPercentage(riskData.interestRate)}</p>
				</div>
			)}
		</div>
	);
}
