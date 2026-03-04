import { BrowserRouter, useLocation, Link } from 'react-router-dom';
import { CreditProvider, useCredit } from './context/CreditContext';
import AppRoutes from './routes/AppRoutes';
import { useState, useEffect } from 'react';
import { getSystemHealth } from './api/creditApi';

function NavBar() {
	const location = useLocation();
	const { fileId, analysisId, analysisStatus } = useCredit();

	const getStepState = (path) => {
		if (location.pathname === path) return 'active';
		if (path === '/' && (location.pathname === '/analyze' || location.pathname === '/report')) return 'completed';
		if (path === '/analyze' && location.pathname === '/report') return 'completed';
		return '';
	};

	return (
		<nav className="navbar">
			<Link to="/" className="navbar-brand">
				<div className="logo-icon">IC</div>
				<div>
					<h1>Intelli-Credit</h1>
				</div>
				<span className="badge">AI Engine</span>
			</Link>

			<div className="stepper">
				<Link to="/" className={`step ${getStepState('/')}`}>
					<span className="step-number">{getStepState('/') === 'completed' ? '✓' : '1'}</span>
					Upload
				</Link>
				<div className="step-divider" />
				<Link to={fileId ? '/analyze' : '#'} className={`step ${getStepState('/analyze')}`}>
					<span className="step-number">{getStepState('/analyze') === 'completed' ? '✓' : '2'}</span>
					Analyze
				</Link>
				<div className="step-divider" />
				<Link to={analysisStatus === 'complete' ? '/report' : '#'} className={`step ${getStepState('/report')}`}>
					<span className="step-number">{getStepState('/report') === 'completed' ? '✓' : '3'}</span>
					Report
				</Link>
			</div>
		</nav>
	);
}

function Footer() {
	const [health, setHealth] = useState(null);

	useEffect(() => {
		const checkHealth = async () => {
			try {
				const res = await getSystemHealth();
				setHealth(res.data);
			} catch {
				setHealth(null);
			}
		};
		checkHealth();
		const interval = setInterval(checkHealth, 30000);
		return () => clearInterval(interval);
	}, []);

	const getStatusClass = (status) => {
		if (status === 'ok') return 'healthy';
		if (status === 'unreachable') return 'down';
		return 'degraded';
	};

	return (
		<footer className="footer">
			<span>© 2024 Intelli-Credit AI Engine — Phase 1 Prototype</span>
			<div className="system-status">
				{health ? (
					<>
						{Object.entries(health).map(([service, status]) => (
							<span key={service} title={`${service}: ${status}`}>
								<span className={`status-dot ${getStatusClass(status)}`} /> {service}
							</span>
						))}
					</>
				) : (
					<span><span className="status-dot degraded" /> Checking services...</span>
				)}
			</div>
		</footer>
	);
}

function App() {
	return (
		<BrowserRouter>
			<CreditProvider>
				<NavBar />
				<main className="page-container">
					<AppRoutes />
				</main>
				<Footer />
			</CreditProvider>
		</BrowserRouter>
	);
}

export default App;
