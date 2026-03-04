export default function LoadingSpinner({ message = 'Loading...' }) {
	return (
		<div style={{ margin: '32px 0', textAlign: 'center' }}>
			<div style={{
				width: '40px',
				height: '40px',
				border: '3px solid var(--border)',
				borderTop: '3px solid var(--primary)',
				borderRadius: '50%',
				animation: 'spin 0.8s linear infinite',
				margin: '0 auto 16px',
			}} />
			<p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{message}</p>
			<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
		</div>
	);
}
