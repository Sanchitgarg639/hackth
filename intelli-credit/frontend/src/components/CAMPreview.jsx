import React from 'react';

export default function CAMPreview({ report, generatingDoc, handleGenerateDoc }) {
	const risk = report?.riskDetails || {};
	const summary = report?.summary || {};
	const fiveCs = summary.fiveCs || {};

	return (
		<div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
				<div>
					<h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>📄 CAM Auto-Generator</h3>
					<p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Instant Credit Appraisal Memo Export</p>
				</div>
				<button 
					className="btn btn-primary" 
					onClick={handleGenerateDoc} 
					disabled={generatingDoc}
					style={{ padding: '8px 16px', fontSize: '0.9rem' }}
				>
					{generatingDoc ? '⏳ Writing...' : (report?.camUrl && report.camUrl !== '/static/sample-cam.pdf') ? '📥 Download .docx' : '📝 Generate DOCX'}
				</button>
			</div>

			<div style={{ flex: 1, overflowY: 'auto', paddingRight: '12px' }}>
				<div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
					<h4 style={{ textAlign: 'center', marginBottom: '4px', color: 'var(--text-primary)' }}>CREDIT APPRAISAL MEMO</h4>
					<p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '24px' }}>Draft Preview Mode</p>

					<div style={{ marginBottom: '16px' }}>
						<strong>Entity:</strong> {report?.companyName || 'Unknown'} <br/>
						<strong>Requested Limit:</strong> INR {risk.recommendedLimit?.toLocaleString() || 0} <br/>
						<strong>Recommendation:</strong> {risk.recommendation || 'Pending'} <br/>
					</div>

					<div style={{ marginBottom: '16px', borderTop: '1px dashed var(--border)', paddingTop: '16px' }}>
						<strong>1. Executive Summary</strong>
						<p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
							The AI model assigns a Probability of Default of {((risk.pd || 0) * 100).toFixed(2)}%, equating to a {risk.grade || 'N/A'} rating. 
							The exposure expected loss is INR {risk.expected_loss?.toLocaleString() || 0}.
						</p>
					</div>

					<div style={{ marginBottom: '16px', borderTop: '1px dashed var(--border)', paddingTop: '16px' }}>
						<strong>2. Five Cs Synthesis</strong>
						<ul style={{ paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
							<li><strong>Character:</strong> {fiveCs.character || 'Stable'}</li>
							<li><strong>Capacity:</strong> {fiveCs.capacity || 'Adequate'}</li>
							<li><strong>Capital:</strong> {fiveCs.capital || 'Moderate'}</li>
							<li><strong>Collateral:</strong> {fiveCs.collateral || 'Partial'}</li>
							<li><strong>Conditions:</strong> {fiveCs.conditions || 'Watchlist'}</li>
						</ul>
					</div>
					
					<div style={{ borderTop: '1px dashed var(--border)', paddingTop: '16px' }}>
						<p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
							* Document automatically formatted via python-docx. Click Generate above to retrieve the finalized multi-page printable report with full ML SHAP audit trails.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
