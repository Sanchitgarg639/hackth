import React from 'react';

export default function FactorScoreCard({ title, score, weight, explanation, isHighRisk }) {
	const getBarColor = () => {
		if (isHighRisk || score < 50) return 'var(--danger)';
		if (score < 70) return 'var(--warning)';
		return 'var(--success)';
	};

	return (
		<div style={{ 
			padding: '16px', 
			background: 'var(--bg-surface)', 
			borderRadius: 'var(--radius-md)', 
			border: '1px solid var(--border-default)',
			display: 'flex',
			flexDirection: 'column',
			gap: '12px'
		}}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{title}</div>
				<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-subtle)', padding: '2px 8px', borderRadius: '4px' }}>
					Weight: {weight}
				</div>
			</div>
			
			<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
				<div style={{ flex: 1, height: '6px', background: 'var(--bg-subtle)', borderRadius: '999px', overflow: 'hidden' }}>
					<div style={{ 
						height: '100%', 
						width: `${score}%`, 
						background: getBarColor(),
						borderRadius: '999px',
						transition: 'width 1s ease-in-out'
					}} />
				</div>
				<div style={{ fontWeight: 700, fontSize: '1.1rem', color: getBarColor(), width: '35px', textAlign: 'right' }}>
					{score}
				</div>
			</div>

			{explanation && (
				<div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', borderTop: '1px dashed var(--border-strong)', paddingTop: '8px' }}>
					"{explanation}"
				</div>
			)}
		</div>
	);
}
