const QUADRANTS = [
	{ key: 'strengths', label: 'Strengths', icon: '💪', bg: '#e6f9e9', border: '#28a745', color: '#155724' },
	{ key: 'weaknesses', label: 'Weaknesses', icon: '⚠', bg: '#fde8e8', border: '#dc3545', color: '#721c24' },
	{ key: 'opportunities', label: 'Opportunities', icon: '🚀', bg: '#e3f2fd', border: '#007bff', color: '#004085' },
	{ key: 'threats', label: 'Threats', icon: '🔥', bg: '#fff3e0', border: '#fd7e14', color: '#856404' },
];

export default function SwotGrid({ swotAnalysis }) {
	if (!swotAnalysis) return null;

	const swot = swotAnalysis.swot || swotAnalysis;

	return (
		<div className="enterprise-card" style={{ marginBottom: '24px' }}>
			<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
				<h3 style={{ margin: 0, fontSize: '1.1rem' }}>🎯 SWOT Analysis</h3>
				{swotAnalysis.source === 'gemini' && (
					<span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: '#e3f2fd', color: '#1565c0', fontWeight: 600 }}>
						✨ Gemini-Powered
					</span>
				)}
				{swotAnalysis.source === 'heuristic' && (
					<span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: 'var(--bg-subtle)', color: 'var(--text-muted)', fontWeight: 600 }}>
						Stub Mode
					</span>
				)}
			</div>

			<div style={{
				display: 'grid',
				gridTemplateColumns: '1fr 1fr',
				gap: '12px',
			}}>
				{QUADRANTS.map(q => {
					const items = swot?.[q.key] || [];
					return (
						<div key={q.key} style={{
							background: q.bg,
							border: `1px solid ${q.border}`,
							borderRadius: 'var(--radius-sm)',
							padding: '16px',
						}}>
							<div style={{ fontWeight: 700, fontSize: '0.95rem', color: q.color, marginBottom: '10px' }}>
								{q.icon} {q.label}
							</div>
							{items.length === 0 ? (
								<div style={{ color: q.color, opacity: 0.5, fontSize: '0.85rem', fontStyle: 'italic' }}>No data</div>
							) : (
								<ul style={{ margin: 0, paddingLeft: '16px' }}>
									{items.map((item, i) => {
										const point = typeof item === 'string' ? item : item?.point || '';
										const dataRef = typeof item === 'object' ? item?.data_ref : null;
										return (
											<li key={i} style={{ marginBottom: '8px', fontSize: '0.85rem', color: q.color }}>
												{point}
												{dataRef && (
													<div style={{ fontSize: '0.75rem', opacity: 0.7, fontStyle: 'italic', marginTop: '2px' }}>
														📊 {dataRef}
													</div>
												)}
											</li>
										);
									})}
								</ul>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
