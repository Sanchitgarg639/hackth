export default function LoadingSpinner({ message = 'Loading...' }) {
	return (
		<div style={{ margin: '20px 0', fontStyle: 'italic', color: '#666' }}>
			<p>⏳ {message}</p>
		</div>
	);
}
