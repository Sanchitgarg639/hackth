import React from 'react';

export default function ExplainabilityPanel({ reasons }) {
	if (!reasons || reasons.length === 0) return null;

	return (
		<div className="enterprise-card" style={{ 
			marginTop: '24px', 
			background: 'var(--bg-surface) 0%, rgba(30,30,50,0.9) 100%)',
			border: '1px solid var(--primary-glow)'
		}}>
			<div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>

				<div>
					<h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-light)', margin: 0 }}>Decision Intelligence Panel</h3>
					<p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>SHAP Explainability AI — Why the model arrived at this score</p>
				</div>
			</div>

			<div className="driver-list">
				{reasons.map((d, i) => {
					const isNegative = d.impact.includes('-Risk') || d.impact.includes('Mitigant');
					const isPositive = d.impact.includes('+Risk') || d.impact.includes('Driver');
					
					let impactClass = 'impact-neutral';
					if (isPositive) impactClass = 'impact-negative'; // Negative towards the company (higher risk)
					else if (isNegative) impactClass = 'impact-positive'; // Positive towards company (mitigant)
					
					return (
						<div key={i} className="driver-item" style={{ 
							padding: '16px', 
							background: 'rgba(0,0,0,0.2)', 
							borderLeft: `4px solid ${isPositive ? 'var(--danger)' : isNegative ? 'var(--success)' : 'var(--text-muted)'}` 
						}}>
							<div style={{ flex: 1 }}>
								<div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
									{d.text}
								</div>
								<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
									{d.factor || 'Machine Learning Feature'}
								</div>
							</div>
							<span className={`impact ${impactClass}`} style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
								{d.impact}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
