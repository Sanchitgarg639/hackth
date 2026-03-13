import React from 'react';

export default function CAMPreview({ report, generatingDoc, handleGenerateDoc }) {
	const risk = report?.riskDetails || {};
	const summary = report?.summary || {};
	const fiveCs = summary.fiveCs || {};
	const companyName = report?.companyName || 'Company';
	const riskScore = risk.score || 0;
	const riskGrade = risk.grade || risk.Grade || 'N/A';
	const riskDecision = risk.decision || risk.Decision || 'REVIEW';
	const pd = risk.pd || 0;
	const recLimit = risk.recommendedLimit;
	const fmtLimit = recLimit ? `₹${(recLimit / 10000000).toFixed(2)} Cr` : (report?.extractedData?.financials?.totalDebt ? `₹${(report.extractedData.financials.totalDebt / 10000000).toFixed(2)} Cr` : '—');

	return (
		<div className="enterprise-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-default)', paddingBottom: '16px' }}>
				<div>
					<h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>CAM Auto-Generator</h3>
					<p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Instant Credit Appraisal Memo Export</p>
				</div>
				<button 
					className="btn btn-primary" 
					onClick={handleGenerateDoc} 
					disabled={generatingDoc}
					style={{ padding: '8px 16px', fontSize: '0.9rem' }}
				>
					{generatingDoc ? 'Writing...' : (report?.camUrl && report.camUrl !== '/static/sample-cam.pdf') ? 'Download .docx' : '📝 Generate DOCX'}
				</button>
			</div>

			<div style={{ flex: 1, overflowY: 'auto', paddingRight: '12px' }}>
				<div style={{ background: 'var(--bg-subtle)', padding: '24px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
					<h4 style={{ textAlign: 'center', marginBottom: '4px', color: 'var(--text-primary)' }}>CREDIT APPRAISAL MEMO</h4>
					<p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '24px' }}>Draft Preview Mode</p>

					<div style={{ marginBottom: '16px' }}>
						<strong>Entity:</strong> {companyName} <br/>
						<strong>Risk Score:</strong> {riskScore} / 100 <br/>
						<strong>Grade:</strong> {riskGrade} <br/>
						<strong>Decision:</strong>{' '}
						<span style={{
							padding: '2px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.85rem',
							background: riskDecision === 'APPROVE' ? 'var(--success)' : riskDecision === 'REJECT' ? 'var(--danger)' : 'var(--warning)',
							color: '#fff',
						}}>
							{riskDecision}
						</span> <br/>
						<strong>Recommended Limit:</strong> {fmtLimit} <br/>
					</div>

					<div style={{ marginBottom: '16px', borderTop: '1px dashed var(--border-default)', paddingTop: '16px' }}>
						<strong>1. Executive Summary</strong>
						<p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
							The AI model assigns a Probability of Default of {(pd * 100).toFixed(2)}%, equating to a {riskGrade} rating.
							{risk.suggestedInterestRate && <> Suggested interest rate band: {risk.suggestedInterestRate}.</>}
						</p>
					</div>

					<div style={{ marginBottom: '16px', borderTop: '1px dashed var(--border-default)', paddingTop: '16px' }}>
						<strong>2. Five Cs Synthesis</strong>
						<ul style={{ paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
							<li><strong>Character:</strong> {fiveCs.character || 'Stable'}</li>
							<li><strong>Capacity:</strong> {fiveCs.capacity || 'Adequate'}</li>
							<li><strong>Capital:</strong> {fiveCs.capital || 'Moderate'}</li>
							<li><strong>Collateral:</strong> {fiveCs.collateral || 'Partial'}</li>
							<li><strong>Conditions:</strong> {fiveCs.conditions || 'Watchlist'}</li>
						</ul>
					</div>

					{summary.recommendation && (
						<div style={{ marginBottom: '16px', borderTop: '1px dashed var(--border-default)', paddingTop: '16px' }}>
							<strong>3. Recommendation</strong>
							<p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '4px', fontWeight: 600 }}>
								{summary.recommendation}
							</p>
						</div>
					)}
					
					<div style={{ borderTop: '1px dashed var(--border-default)', paddingTop: '16px' }}>
						<p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
							* Click Generate above to download the full Credit Appraisal Memo with financial data, risk assessment, SWOT analysis, and audit trails.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
