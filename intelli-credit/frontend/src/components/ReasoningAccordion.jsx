import { useState } from 'react';

const DIRECTION_CONFIG = {
	positive: { color: 'var(--success)', icon: '↑', bg: '#e6f9e9' },
	negative: { color: 'var(--danger)', icon: '↓', bg: '#fde8e8' },
	neutral: { color: 'var(--text-muted)', icon: '→', bg: 'var(--bg-subtle)' },
};

export default function ReasoningAccordion({ reasoningBreakdown, verdict }) {
	const [expanded, setExpanded] = useState(null);

	const factors = reasoningBreakdown || [];

	if (factors.length === 0) return null;

	const toggle = (i) => setExpanded(prev => prev === i ? null : i);

	return (
		<div className="enterprise-card" style={{ marginBottom: '24px' }}>
			<h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>🧠 Reasoning Engine Breakdown</h3>

			<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
				{factors.map((f, i) => {
					const dir = DIRECTION_CONFIG[f.direction] || DIRECTION_CONFIG.neutral;
					const isOpen = expanded === i;

					return (
						<div key={i} style={{
							border: '1px solid var(--border-default)',
							borderRadius: 'var(--radius-sm)',
							overflow: 'hidden',
							transition: 'box-shadow 0.2s ease',
						}}>
							{/* Accordion Header */}
							<button
								onClick={() => toggle(i)}
								style={{
									width: '100%', background: isOpen ? 'var(--bg-subtle)' : 'transparent',
									border: 'none', cursor: 'pointer', padding: '12px 16px',
									display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left',
								}}
							>
								{/* Direction indicator */}
								<span style={{
									width: '24px', height: '24px', borderRadius: '50%',
									background: dir.bg, color: dir.color,
									display: 'flex', alignItems: 'center', justifyContent: 'center',
									fontWeight: 900, fontSize: '0.9rem', flexShrink: 0,
								}}>
									{dir.icon}
								</span>

								{/* Factor name */}
								<span style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
									{f.factor_name}
								</span>

								{/* Weight */}
								<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '8px' }}>
									Weight: {f.weight_pct}%
								</span>

								{/* Score bar */}
								<div style={{ width: '80px', height: '6px', background: 'var(--border-default)', borderRadius: '3px', marginRight: '8px' }}>
									<div style={{
										height: '100%', width: `${f.score || 0}%`,
										background: f.score >= 70 ? 'var(--success)' : f.score >= 40 ? 'var(--warning)' : 'var(--danger)',
										borderRadius: '3px', transition: 'width 0.5s ease',
									}} />
								</div>

								{/* Score */}
								<span style={{ fontWeight: 700, fontSize: '0.9rem', color: dir.color, width: '36px', textAlign: 'right' }}>
									{f.score}
								</span>

								{/* Chevron */}
								<span style={{
									fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px',
									transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease',
								}}>▼</span>
							</button>

							{/* Expanded detail */}
							{isOpen && (
								<div style={{
									padding: '12px 16px 14px 50px',
									borderTop: '1px solid var(--border-default)',
									background: 'var(--bg-card)',
									display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px',
								}}>
									<div>
										<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Raw Value</div>
										<div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{f.raw_value || '—'}</div>
									</div>
									<div>
										<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Weighted Contribution</div>
										<div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{f.weighted_contribution?.toFixed(2) || '—'}</div>
									</div>
									<div style={{ gridColumn: '1 / -1' }}>
										<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>AI Reasoning</div>
										<div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>{f.reasoning}</div>
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* Verdict card */}
			{verdict && (
				<div style={{
					marginTop: '16px', padding: '16px', borderRadius: 'var(--radius-sm)',
					background: verdict.decision === 'APPROVE' ? '#e6f9e9' : verdict.decision === 'REJECT' ? '#fde8e8' : '#fff3e0',
					border: `1px solid ${verdict.decision === 'APPROVE' ? 'var(--success)' : verdict.decision === 'REJECT' ? 'var(--danger)' : 'var(--warning)'}`,
				}}>
					<div style={{ fontWeight: 700, marginBottom: '6px', fontSize: '1rem' }}>
						🏆 Final Verdict: {verdict.decision}
					</div>
					{verdict.summary && <div style={{ fontSize: '0.85rem' }}>{verdict.summary}</div>}
					{verdict.top_factors_for && (
						<div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
							<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>For:</span>
							{verdict.top_factors_for.map(f => (
								<span key={f} style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: '#e6f9e9', color: 'var(--success)', fontWeight: 600 }}>{f}</span>
							))}
							{verdict.top_factors_against?.length > 0 && (
								<>
									<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Against:</span>
									{verdict.top_factors_against.map(f => (
										<span key={f} style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: '#fde8e8', color: 'var(--danger)', fontWeight: 600 }}>{f}</span>
									))}
								</>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
