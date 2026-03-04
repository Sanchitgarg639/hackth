import { useState, useEffect } from 'react';
import { startResearch, getResearchFindings, storeQualitativeInput, getQualitativeInput } from '../api/creditApi';
import { useCredit } from '../context/CreditContext';

export default function ResearchSection() {
	const { companyId } = useCredit();
	const [loading, setLoading] = useState(false);
	const [findings, setFindings] = useState([]);
	const [summary, setSummary] = useState(null);
	const [error, setError] = useState('');
	
	// qualitative inputs
	const [notes, setNotes] = useState('');
	const [siteVisitRating, setSiteVisitRating] = useState(0);
	const [managementRating, setManagementRating] = useState(0);
	const [isSaved, setIsSaved] = useState(false);

	useEffect(() => {
		if (companyId) {
			fetchData();
		}
	}, [companyId]);

	const fetchData = async () => {
		try {
			const res = await getResearchFindings(companyId);
			if (res.data.findings && res.data.findings.length > 0) {
				setFindings(res.data.findings);
				setSummary(res.data.summary);
			}
			
			const qualRes = await getQualitativeInput(companyId);
			if (qualRes.data) {
				setNotes(qualRes.data.notes || '');
				setSiteVisitRating(qualRes.data.siteVisitRating || 0);
				setManagementRating(qualRes.data.managementQualityRating || 0);
				setIsSaved(true);
			}
		} catch (err) {
			// Will 404 if no previous data, that's fine
		}
	};

	const handleStartResearch = async () => {
		setLoading(true);
		setError('');
		try {
			const res = await startResearch(companyId);
			await fetchData();
			if (res.data.findingsCount === 0) {
				setError('Research completed, but no relevant news or warnings found.');
			}
		} catch (err) {
			setError(err.response?.data?.error?.message || 'Failed to trigger Research Agent');
		} finally {
			setLoading(false);
		}
	};

	const handleSaveQualitative = async () => {
		try {
			await storeQualitativeInput(companyId, {
				notes,
				siteVisitRating: siteVisitRating || undefined,
				managementQualityRating: managementRating || undefined
			});
			setIsSaved(true);
			setTimeout(() => setIsSaved(false), 3000);
		} catch (err) {
			setError('Failed to save assessment');
		}
	};

	const getSentimentColor = (label) => {
		switch (label) {
			case 'CRITICAL': return 'var(--danger)';
			case 'NEGATIVE': return 'var(--warning)';
			case 'POSITIVE': return 'var(--success)';
			default: return 'var(--text-secondary)';
		}
	};
    
	if (!companyId) return null;

	return (
		<div className="glass-card" style={{ marginTop: '32px' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
				<div>
					<h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
						🌐 AI Research Agent 
					</h3>
					<p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
						Auto-scans news, court records, and regulatory notices for risk footprint.
					</p>
				</div>
                
				{findings.length === 0 && (
					<button className="btn btn-primary" onClick={handleStartResearch} disabled={loading}>
						{loading ? '⏳ Scanning WWW...' : '🔍 Run Research'}
					</button>
				)}
			</div>

			{error && (
				<div style={{ padding: '12px 16px', background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', marginBottom: '16px' }}>
					⚠ {error}
				</div>
			)}

			{findings.length > 0 && (
				<div className="fade-in" style={{ marginBottom: '32px' }}>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
						<div className="summary-card">
							<div className="card-label">Critical Alerts</div>
							<div className="card-value" style={{ color: summary?.criticalCount > 0 ? 'var(--danger)' : 'inherit' }}>
								{summary?.criticalCount || 0}
							</div>
						</div>
						<div className="summary-card">
							<div className="card-label">Negative Sentiment</div>
							<div className="card-value" style={{ color: summary?.negativeCount > 0 ? 'var(--warning)' : 'inherit' }}>
								{summary?.negativeCount || 0}
							</div>
						</div>
						<div className="summary-card">
							<div className="card-label">Total Scan Hits</div>
							<div className="card-value">{summary?.total_items || findings.length}</div>
						</div>
						<div className="summary-card">
							<div className="card-label">Overall Sentiment</div>
							<div className="card-value" style={{ color: (summary?.avg_sentiment || 0) < 0 ? 'var(--danger)' : 'var(--success)' }}>
								{summary?.avg_sentiment?.toFixed(2) || '0.00'}
							</div>
						</div>
					</div>

					<h4 style={{ fontSize: '1rem', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>📰 News & Regulatory Scans</h4>
					<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
						{findings.map((f, i) => (
							<div key={i} style={{ 
								padding: '16px', background: 'var(--bg-secondary)', 
								borderRadius: 'var(--radius-md)', borderLeft: `4px solid ${getSentimentColor(f.sentimentLabel)}`,
								display: 'flex', flexDirection: 'column', gap: '8px'
							}}>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
									<a href={f.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', lineHeight: 1.4 }}>
										{f.title}
									</a>
									<span style={{ 
										padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
										background: `${getSentimentColor(f.sentimentLabel)}20`, color: getSentimentColor(f.sentimentLabel)
									}}>
										{f.sentimentLabel}
									</span>
								</div>
								<div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
									<span>🏢 {f.source}</span>
									<span>📅 {new Date(f.publishedDate).toLocaleDateString()}</span>
								</div>
								
								{f.riskTags && f.riskTags.length > 0 && (
									<div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
										{f.riskTags.map(tag => (
											<span key={tag} style={{ 
												padding: '2px 8px', background: 'rgba(239,68,68,0.1)', 
												border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)', 
												borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600 
											}}>
												#{tag}
											</span>
										))}
									</div>
								)}
							</div>
						))}
					</div>
					
					{findings.length > 0 && (
						<div style={{ textAlign: 'center', marginTop: '16px' }}>
							<button className="btn btn-secondary" onClick={handleStartResearch} disabled={loading}>
								{loading ? '⏳ Refreshing...' : '⟳ Refresh Research'}
							</button>
						</div>
					)}
				</div>
			)}

			<div style={{ paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
				<h4 style={{ fontSize: '1rem', marginBottom: '16px' }}>✍ Credit Officer Qualitative Assessment</h4>
				
				<div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 250px', gap: '24px' }}>
					<div>
						<label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Officer Notes & Override Justification</label>
						<textarea 
							className="input-field" 
							rows="5" 
							placeholder="Enter qualitative observations, management interview notes, or rationale for risk overrides..."
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							style={{ resize: 'vertical' }}
						></textarea>
					</div>
					
					<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
						<div>
							<label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Site Visit Rating (1-5)</label>
							<select className="input-field" value={siteVisitRating} onChange={(e) => setSiteVisitRating(Number(e.target.value))}>
								<option value="0">Not Rated</option>
								<option value="1">1 - Poor, Critical Discrepancies</option>
								<option value="2">2 - Below Average</option>
								<option value="3">3 - Satisfactory, Minor Issues</option>
								<option value="4">4 - Good</option>
								<option value="5">5 - Excellent, Fully Verified</option>
							</select>
						</div>
						
						<div>
							<label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Management Quality (1-5)</label>
							<select className="input-field" value={managementRating} onChange={(e) => setManagementRating(Number(e.target.value))}>
								<option value="0">Not Rated</option>
								<option value="1">1 - Poor, Defensive/Evasive</option>
								<option value="2">2 - Below Average</option>
								<option value="3">3 - Standard, Transparent</option>
								<option value="4">4 - Strong, Experienced</option>
								<option value="5">5 - Exceptional Lineage</option>
							</select>
						</div>
						
						<button 
							className="btn btn-primary" 
							style={{ marginTop: 'auto', background: isSaved ? 'var(--success)' : '' }}
							onClick={handleSaveQualitative}
							disabled={!notes}
						>
							{isSaved ? '✓ Saved Successfully' : '💾 Save Assessment'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
