export default function TriangulationSection({ triangulationResults }) {
	if (!triangulationResults) return null;

	const { contradictions = [], confirmations = [], overall_triangulation_score } = triangulationResults;

	const scoreColor = overall_triangulation_score >= 70
		? 'var(--success)'
		: overall_triangulation_score >= 40
			? 'var(--warning)'
			: 'var(--danger)';

	return (
		<div className="enterprise-card" style={{ marginBottom: '24px' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
				<h3 style={{ margin: 0, fontSize: '1.1rem' }}>⚖️ Triangulation Alerts</h3>
				<div style={{ textAlign: 'right' }}>
					<div style={{ fontSize: '1.6rem', fontWeight: 800, color: scoreColor }}>{overall_triangulation_score}</div>
					<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Consistency Score / 100</div>
				</div>
			</div>

			{contradictions.length > 0 && (
				<div style={{ marginBottom: '12px' }}>
					<div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
						⚠ {contradictions.length} Contradiction{contradictions.length > 1 ? 's' : ''} Found
					</div>
					{contradictions.map((c, i) => (
						<div key={i} className="alert-card alert-danger" style={{ marginBottom: '8px' }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
								<div>
									<div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '2px' }}>{c.check}</div>
									<div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{c.flag}</div>
								</div>
								{c.severity && (
									<span style={{
										fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', whiteSpace: 'nowrap',
										background: c.severity === 'high' ? 'var(--danger)' : 'var(--warning)',
										color: '#fff', fontWeight: 700, textTransform: 'uppercase',
									}}>
										{c.severity}
									</span>
								)}
							</div>
						</div>
					))}
				</div>
			)}

			{confirmations.length > 0 && (
				<div>
					<div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--success)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
						✓ {confirmations.length} Confirmation{confirmations.length > 1 ? 's' : ''}
					</div>
					{confirmations.map((c, i) => (
						<div key={i} className="alert-card alert-success" style={{ marginBottom: '8px' }}>
							<div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '2px' }}>{c.check}</div>
							<div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{c.message}</div>
						</div>
					))}
				</div>
			)}

			{contradictions.length === 0 && confirmations.length === 0 && (
				<div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
					No triangulation data available yet.
				</div>
			)}
		</div>
	);
}
