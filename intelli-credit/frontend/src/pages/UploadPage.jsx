import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadFile } from '../api/creditApi';
import { useCredit } from '../context/CreditContext';

export default function UploadPage() {
	const [files, setFiles] = useState([]);
	const [companyName, setCompanyName] = useState('');
	const [sector, setSector] = useState('');
	const [gstin, setGstin] = useState('');
	const [pan, setPan] = useState('');
	const [loading, setLoading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState('');
	const [toast, setToast] = useState(null);
	const [dragOver, setDragOver] = useState(false);
	const fileInputRef = useRef(null);
	const navigate = useNavigate();
	const { setCompanyId, setFileId, setExtractedData, reset } = useCredit();

	const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
	const handleDragLeave = () => setDragOver(false);
	const handleDrop = (e) => {
		e.preventDefault();
		setDragOver(false);
		const dropped = Array.from(e.dataTransfer.files);
		setFiles(prev => [...prev, ...dropped]);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (files.length === 0 || !companyName) return;

		setLoading(true);
		setError('');
		setProgress(10);

		try {
			const interval = setInterval(() => {
				setProgress(prev => Math.min(prev + 15, 85));
			}, 300);

			const res = await uploadFile(files, companyName, sector, gstin, pan);
			clearInterval(interval);
			setProgress(100);

			reset();
			setCompanyId(res.data.companyId);
			setFileId(res.data.fileId);
			setExtractedData(res.data.extractedData);

			setToast({ type: 'success', message: `✓ File uploaded — ID: ${res.data.fileId?.substring(0, 20)}...` });

			setTimeout(() => navigate('/analyze'), 1500);
		} catch (err) {
			setProgress(0);
			const msg = err.response?.data?.error?.message || err.message || 'Upload failed';
			setError(msg);
			setToast({ type: 'error', message: msg });
		} finally {
			setLoading(false);
		}
	};

	const handleDemoUpload = async () => {
		setLoading(true);
		setError('');
		setProgress(10);
		setCompanyName('Reliance Industries');
		setSector('Conglomerate');
		setGstin('27AAACR5055K1Z1');
		setPan('AAACR5055K');

		try {
			const interval = setInterval(() => {
				setProgress(prev => Math.min(prev + 15, 85));
			}, 300);

			// Fetch the generated PDF as a File object natively from the Public folder
			const resPdf = await fetch('/demo-data/sample_annual_report.pdf');
			const blobPdf = await resPdf.blob();
			const demoPdf = new File([blobPdf], 'Reliance_Annual_Report_2023.pdf', { type: 'application/pdf' });

			const resCsv = await fetch('/demo-data/sample_gst.csv');
			const blobCsv = await resCsv.blob();
			const demoCsv = new File([blobCsv], 'Reliance_GST_2023.csv', { type: 'text/csv' });

			setFiles([demoPdf, demoCsv]);

			const res = await uploadFile([demoPdf, demoCsv], 'Reliance Industries', 'Conglomerate', '27AAACR5055K1Z1', 'AAACR5055K');

			clearInterval(interval);
			setProgress(100);

			reset();
			setCompanyId(res.data.companyId);
			setFileId(res.data.fileId);
			setExtractedData(res.data.extractedData);

			setToast({ type: 'success', message: `✓ Demo Authenticated — ID: ${res.data.fileId?.substring(0, 15)}...` });

			setTimeout(() => navigate('/analyze'), 1500);
		} catch (err) {
			setProgress(0);
			const msg = err.response?.data?.error?.message || err.message || 'Demo Upload failed';
			setError(msg);
			setToast({ type: 'error', message: msg });
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="fade-in">
			{toast && (
				<div className={`toast toast-${toast.type}`} onAnimationEnd={() => setTimeout(() => setToast(null), 3000)}>
					{toast.message}
				</div>
			)}

			<div className="page-header">
				<h2>Upload Financial Documents</h2>
				<p>Upload annual reports, bank statements, or financial data for AI-powered credit analysis</p>
			</div>

			<form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
				{/* Drag & Drop Zone */}
				<div
					className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					onClick={() => fileInputRef.current?.click()}
				>
					<div className="icon" style={{ fontSize: '2rem', color: 'var(--text-muted)' }}>{files.length > 0 ? '✓' : '↑'}</div>
					{files.length > 0 ? (
						<div className="file-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
							{files.map((f, i) => (
								<div key={i} className="file-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-subtle)', padding: '8px 16px', borderRadius: 'var(--radius-sm)' }}>
									<span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.name}</span>
									<span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{(f.size / 1024 / 1024).toFixed(2)} MB</span>
									<button type="button" onClick={(e) => { e.stopPropagation(); setFiles(files.filter((_, idx) => idx !== i)); }} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
								</div>
							))}
						</div>
					) : (
						<>
							<p>Drag & drop your files here, or click to browse</p>
							<p className="hint">Accepted: PDF, CSV, XLSX, JSON — Max 20MB</p>
						</>
					)}
					<input
						ref={fileInputRef}
						type="file"
						multiple
						accept=".pdf,.csv,.xlsx,.json"
						onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files)])}
						style={{ display: 'none' }}
					/>
				</div>

				{/* Progress Bar */}
				{loading && (
					<div className="progress-bar-container">
						<div className="progress-bar" style={{ width: `${progress}%` }} />
					</div>
				)}

				{/* Company Info */}
				<div className="enterprise-card">
					<h3 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: 600 }}>Company Information</h3>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
						<div className="input-group">
							<label>Company Name *</label>
							<input className="input-field" type="text" placeholder="e.g., Tata Steel Ltd" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
						</div>
						<div className="input-group">
							<label>Sector</label>
							<input className="input-field" type="text" placeholder="e.g., Manufacturing" value={sector} onChange={e => setSector(e.target.value)} />
						</div>
						<div className="input-group">
							<label>GSTIN</label>
							<input className="input-field" type="text" placeholder="e.g., 27AAPCT1234A1Z5" value={gstin} onChange={e => setGstin(e.target.value)} />
						</div>
						<div className="input-group">
							<label>PAN</label>
							<input className="input-field" type="text" placeholder="e.g., AAPCT1234A" value={pan} onChange={e => setPan(e.target.value)} />
						</div>
					</div>
				</div>

				{error && (
					<div style={{ padding: '12px 16px', background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '0.9rem' }}>
						⚠ {error}
					</div>
				)}

				<div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
					<button type="submit" className="btn btn-primary" disabled={loading || files.length === 0 || !companyName}>
						{loading ? 'Processing...' : 'Upload & Extract'}
					</button>
					<button type="button" className="btn btn-secondary" onClick={handleDemoUpload} disabled={loading}>
						Quick Demo
					</button>
				</div>
			</form>
		</div>
	);
}
