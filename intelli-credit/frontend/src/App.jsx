import { BrowserRouter } from 'react-router-dom';
import { CreditProvider } from './context/CreditContext';
import AppRoutes from './routes/AppRoutes';

function App() {
	return (
		<BrowserRouter>
			<CreditProvider>
				<div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
					<header>
						<h1>Intelli-Credit AI Engine</h1>
						<hr />
					</header>
					<main>
						<AppRoutes />
					</main>
				</div>
			</CreditProvider>
		</BrowserRouter>
	);
}

export default App;
