import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';

export default function ScoreGauge({ score, grade }) {
	const getColor = (s) => {
		if (s >= 75) return 'var(--success)';
		if (s >= 55) return 'var(--warning)';
		if (s >= 40) return '#f97316'; // Orange
		return 'var(--danger)';
	};

	const data = [
		{ name: 'Score', value: score, fill: getColor(score) }
	];

	return (
		<div className="summary-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', height: '100%', padding: '32px' }}>
			<h4 style={{ position: 'absolute', top: '24px', left: '24px', fontSize: '1rem', color: 'var(--text-muted)' }}>Risk Score</h4>
			
			<div style={{ width: '250px', height: '250px', position: 'relative' }}>
				<ResponsiveContainer width="100%" height="100%">
					<RadialBarChart 
						cx="50%" 
						cy="50%" 
						innerRadius="75%" 
						outerRadius="100%" 
						barSize={20} 
						data={data} 
						startAngle={225} 
						endAngle={-45}
					>
						<PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
						<RadialBar 
							minAngle={15} 
							clockWise 
							dataKey="value" 
							cornerRadius={10} 
							background={{ fill: 'var(--bg-subtle)' }} 
						/>
					</RadialBarChart>
				</ResponsiveContainer>
				
				<div style={{ 
					position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
					display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' 
				}}>
					<span style={{ fontSize: '3rem', fontWeight: 800, color: getColor(score), lineHeight: 1 }}>{score}</span>
					<span style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginTop: '4px' }}>/ 100</span>
				</div>
			</div>

			<div style={{ 
				marginTop: '8px', padding: '6px 20px', borderRadius: '999px', 
				background: `${getColor(score)}20`, color: getColor(score), 
				fontWeight: 700, fontSize: '1.1rem', letterSpacing: '1px' 
			}}>
				GRADE: {grade}
			</div>
		</div>
	);
}
