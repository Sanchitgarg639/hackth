import { useState } from 'react';

const TRACK_CONFIGS = {
	'Company Research': { sentimentColor: (s) => s > 0.5 ? 'var(--success)' : s > 0.2 ? 'var(--warning)' : 'var(--danger)' },
	'Sector Research': { sentimentColor: (s) => s > 0.4 ? 'var(--success)' : 'var(--warning)' },
	'Legal Research': { sentimentColor: (s) => s > 0.5 ? 'var(--success)' : 'var(--danger)' },
	'Market Sentiment': { sentimentColor: (s) => s > 0.4 ? 'var(--success)' : s > 0.2 ? 'var(--warning)' : 'var(--danger)' },
};

export default function ResearchTracksSummary({ researchFindings, researchTracks }) {
	const [expanded, setExpanded] = useState(null);

	// Support both new multi-track format and legacy format
	let tracks = {};
	if (researchTracks) {
		tracks = researchTracks;
	} else if (researchFindings?.tracks) {
		tracks = researchFindings.tracks;
	}

	const trackList = Object.values(tracks);

	if (trackList.length === 0) {
		// Fallback: render legacy research data
		const news = researchFindings?.newsHits || [];
		if (news.length === 0) return null;
		return (
			<div className="enterprise-card" style={{ marginBottom: '24px' }}>
				<h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Secondary Research</h3>
				<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
					{news.slice(0, 5).map((n, i) => (
						<div key={i} style={{ padding: '10px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
							{typeof n === 'string' ? n : n?.title || JSON.stringify(n)}
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="enterprise-card" style={{ marginBottom: '24px' }}>
			<h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Secondary Research — 4 Parallel Tracks</h3>

			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
				{trackList.map((track, i) => {
					const cfg = TRACK_CONFIGS[track.track_name] || {};
					const sentiment = track.sentiment_score ?? 0;
					const sentColor = cfg.sentimentColor ? cfg.sentimentColor(sentiment) : 'var(--text-muted)';
					const isOpen = expanded === i;

					return (
						<div key={i} style={{
							border: '1px solid var(--border-default)',
							borderRadius: 'var(--radius-sm)',
							overflow: 'hidden',
						}}>
							<div
								style={{
									padding: '12px 14px', cursor: 'pointer',
									background: isOpen ? 'var(--bg-subtle)' : 'var(--bg-card)',
									display: 'flex', justifyContent: 'space-between', alignItems: 'center',
								}}
								onClick={() => setExpanded(isOpen ? null : i)}
							>
								<div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
									{track.track_name}
								</div>
								<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
									<span style={{
										fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px',
										background: 'var(--bg-subtle)', color: sentColor, fontWeight: 700,
									}}>
										Sentiment: {sentiment.toFixed(2)}
									</span>
									<span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{isOpen ? '▲' : '▼'}</span>
								</div>
							</div>

							{/* Risk tags */}
							{track.risk_tags?.length > 0 && (
								<div style={{ padding: '4px 14px', display: 'flex', gap: '6px', flexWrap: 'wrap', background: '#fde8e8' }}>
									{track.risk_tags.map(tag => (
										<span key={tag} style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px', background: 'var(--danger)', color: '#fff', fontWeight: 600 }}>
											{tag}
										</span>
									))}
								</div>
							)}

							{/* Key alerts */}
							{track.key_alerts?.length > 0 && (
								<div style={{ padding: '6px 14px', background: '#fff3e0' }}>
									{track.key_alerts.map((alert, j) => (
										<div key={j} style={{ fontSize: '0.8rem', color: '#856404' }}>⚠ {alert}</div>
									))}
								</div>
							)}

							{/* Expanded findings */}
							{isOpen && (
								<div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-default)' }}>
									{(track.findings || []).map((f, j) => (
										<div key={j} style={{
											padding: '8px 10px', marginBottom: '6px',
											background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)',
											fontSize: '0.82rem',
										}}>
											<div style={{ fontWeight: 600, marginBottom: '2px' }}>{f.title}</div>
											<div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
												<span>{f.source}</span>
												<span style={{
													padding: '1px 6px', borderRadius: '10px', fontSize: '0.7rem',
													background: f.sentiment === 'positive' ? '#e6f9e9' : f.sentiment === 'negative' ? '#fde8e8' : 'var(--bg-subtle)',
													color: f.sentiment === 'positive' ? 'var(--success)' : f.sentiment === 'negative' ? 'var(--danger)' : 'var(--text-muted)',
												}}>
													{f.sentiment}
												</span>
											</div>
										</div>
									))}
									{track.source_urls?.length > 0 && (
										<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
											Sources: {track.source_urls.join(', ')}
										</div>
									)}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
