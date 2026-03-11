import { BrowserRouter, useLocation, Link } from 'react-router-dom';
import { CreditProvider, useCredit } from './context/CreditContext';
import AppRoutes from './routes/AppRoutes';
import { useState, useEffect } from 'react';
import { getSystemHealth } from './api/creditApi';

const STEPS = [
	{ path: '/', label: 'Entity Details' },
	{ path: '/upload', label: 'Upload' },
	{ path: '/classify', label: 'Classify' },
	{ path: '/schema', label: 'Schema' },
	{ path: '/extract', label: 'Extract' },
	{ path: '/analyze', label: 'Analyze' },
	{ path: '/report', label: 'Report' },
];

function NavBar() {
	const location = useLocation();
	const { analysisId, analysisStatus } = useCredit();

	const currentIndex = STEPS.findIndex(s => s.path === location.pathname);

	const getStepState = (index) => {
		if (index === currentIndex) return 'active';
		if (index < currentIndex) return 'completed';
		return '';
	};

	const canNavigate = (index) => {
		if (index <= currentIndex) return true;
		return false;
	};

	return (
		<nav className="navbar">
			<Link to="/" className="navbar-brand">
				<div className="logo-icon">IC</div>
				<div>
					<h1>Intelli-Credit</h1>
				</div>
				<span className="badge">AI Engine v2</span>
			</Link>

			<div className="stepper">
				{STEPS.map((step, i) => (
					<div key={step.path} style={{ display: 'flex', alignItems: 'center' }}>
						<Link
							to={canNavigate(i) ? step.path : '#'}
							className={`step ${getStepState(i)}`}
							style={{ pointerEvents: canNavigate(i) ? 'auto' : 'none' }}
						>
							<span className="step-number">
								{getStepState(i) === 'completed' ? '✓' : i + 1}
							</span>
							{step.label}
						</Link>
						{i < STEPS.length - 1 && <div className="step-divider" />}
					</div>
				))}
			</div>
		</nav>
	);
}

function Footer() {
	return (
		<footer className="footer">
			<span>@2026 intelli credit- AI Engine v2</span>
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
