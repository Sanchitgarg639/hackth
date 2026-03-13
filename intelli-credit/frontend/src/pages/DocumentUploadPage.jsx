import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { classifyDocument, uploadFile } from '../api/creditApi';
import { useCredit } from '../context/CreditContext';

const UPLOAD_SLOTS = [
	{ key: 'alm', label: 'ALM Report', desc: 'Asset-Liability Management report showing maturity buckets, liquidity ratios', required: true },
	{ key: 'shareholding', label: 'Shareholding Pattern', desc: 'Promoter, public, institutional holdings and pledge data', required: true },
	{ key: 'borrowing', label: 'Borrowing Profile', desc: 'Total borrowings, bank-wise exposure, cost of funds', required: true },
	{ key: 'annual', label: 'Annual Report', desc: 'P&L, Cash Flow, and Balance Sheet data', required: true },
	{ key: 'portfolio', label: 'Portfolio Cuts / Performance Data', desc: 'Portfolio staging, NPA, PAR, collection efficiency', required: false },
];

export default function DocumentUploadPage() {
	const [slotFiles, setSlotFiles] = useState({});
	const [slotStatus, setSlotStatus] = useState({});
	const [classResults, setClassResults] = useState({});
	const [loading, setLoading] = useState(false);
	const [toast, setToast] = useState(null);
	const fileRefs = useRef({});
	const navigate = useNavigate();
	const { analysisId, entityDetails, setDocuments, setClassificationResults, setCompanyId, setFileId, setExtractedData, reset: ctxReset } = useCredit();

	const handleFileSelect = async (slotKey, file) => {
		if (!file) return;
		// Validate file type and size
		const ext = file.name.split('.').pop().toLowerCase();
		if (!['pdf', 'xlsx', 'xls', 'csv'].includes(ext)) {
			setToast({ type: 'error', message: `Invalid file type .${ext}. Accepted: PDF, XLSX, XLS, CSV` });
			return;
		}
		if (file.size > 25 * 1024 * 1024) {
			setToast({ type: 'error', message: `File ${file.name} exceeds 25MB limit` });
			return;
		}

		setSlotFiles(prev => ({ ...prev, [slotKey]: file }));
		setSlotStatus(prev => ({ ...prev, [slotKey]: 'classifying' }));

		try {
			const res = await classifyDocument(file);
			setClassResults(prev => ({ ...prev, [slotKey]: res.data }));
			setSlotStatus(prev => ({ ...prev, [slotKey]: 'classified' }));
		} catch {
			setSlotStatus(prev => ({ ...prev, [slotKey]: 'uploaded' }));
			setClassResults(prev => ({
				...prev,
				[slotKey]: { predicted_type: 'Unknown', confidence: 0, reasoning: 'Classification unavailable' }
			}));
		}
	};

	const handleDrop = (slotKey, e) => {
		e.preventDefault();
		const file = e.dataTransfer.files[0];
		if (file) handleFileSelect(slotKey, file);
	};

	const handleDemoUpload = async () => {
		setLoading(true);
		try {
			// Fetch demo data files from public folder
			const demoFiles = [
				{ key: 'annual', url: '/demo-data/sample_annual_report.pdf', name: 'Reliance_Annual_Report_2023.pdf', type: 'application/pdf' },
				{ key: 'alm', url: '/demo-data/sample_gst.csv', name: 'ALM_Report_Demo.csv', type: 'text/csv' },
			];

			for (const df of demoFiles) {
				try {
					const r = await fetch(df.url);
					const blob = await r.blob();
					const file = new File([blob], df.name, { type: df.type });
					setSlotFiles(prev => ({ ...prev, [df.key]: file }));
					setSlotStatus(prev => ({ ...prev, [df.key]: 'uploaded' }));
					setClassResults(prev => ({
						...prev,
						[df.key]: { predicted_type: UPLOAD_SLOTS.find(s => s.key === df.key)?.label || 'Unknown', confidence: 85, reasoning: 'Demo file — pre-classified' }
					}));
				} catch { /* skip missing demo files */ }
			}

			// Also do legacy upload for backward compat
			const resPdf = await fetch('/demo-data/sample_annual_report.pdf');
			const blobPdf = await resPdf.blob();
			const demoPdf = new File([blobPdf], 'Reliance_Annual_Report_2023.pdf', { type: 'application/pdf' });

			const resCsv = await fetch('/demo-data/sample_gst.csv');
			const blobCsv = await resCsv.blob();
			const demoCsv = new File([blobCsv], 'Reliance_GST_2023.csv', { type: 'text/csv' });

			const res = await uploadFile([demoPdf, demoCsv], entityDetails?.companyName || 'Reliance Industries', entityDetails?.sector || 'Conglomerate', entityDetails?.gstin || '27AAACR5055K1Z1', entityDetails?.pan || 'AAACR5055K');
			setCompanyId(res.data.companyId);
			setFileId(res.data.fileId);
			setExtractedData(res.data.extractedData);

			setToast({ type: 'success', message: '✓ Demo files loaded into slots' });
		} catch (err) {
			setToast({ type: 'error', message: 'Demo load failed: ' + (err.message || 'Unknown error') });
		} finally {
			setLoading(false);
		}
	};

	const canProceed = () => {
		const requiredSlots = UPLOAD_SLOTS.filter(s => s.required);
		return requiredSlots.every(s => slotFiles[s.key]);
	};

	const handleProceed = () => {
		const docs = Object.entries(slotFiles).map(([key, file]) => ({
			slotKey: key,
			filename: file.name,
			file,
			classification: classResults[key] || {},
		}));
		setDocuments(docs);
		setClassificationResults(classResults);
		navigate('/classify');
	};

	return (
		<div className="fade-in">
			{toast && (
				<div className={`toast toast-${toast.type}`} onAnimationEnd={() => setTimeout(() => setToast(null), 3000)}>
					{toast.message}
				</div>
			)}

			<div className="page-header">
				<h2>Document Upload</h2>
				<p>Upload financial documents into the designated slots for AI-powered extraction</p>
			</div>

			<div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
				{UPLOAD_SLOTS.map(slot => {
					const file = slotFiles[slot.key];
					const status = slotStatus[slot.key];
					const classResult = classResults[slot.key];

					return (
						<div key={slot.key}
							className="enterprise-card"
							style={{ border: file ? '2px solid var(--success)' : slot.required ? '2px solid var(--border-default)' : '2px dashed var(--border-default)', transition: 'border 0.3s ease' }}
							onDragOver={e => e.preventDefault()}
							onDrop={e => handleDrop(slot.key, e)}
						>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
								<div style={{ flex: 1 }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
										<h4 style={{ margin: 0, fontSize: '1rem' }}>{slot.label}</h4>
										{slot.required ? (
											<span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'var(--danger)', color: '#fff', borderRadius: '12px' }}>Required</span>
										) : (
											<span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'var(--bg-subtle)', color: 'var(--text-muted)', borderRadius: '12px' }}>Optional</span>
										)}
										{file && <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'var(--success-bg)', color: 'var(--success)', fontWeight: 600 }}>Uploaded</span>}
									</div>
									<p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{slot.desc}</p>

									{file && (
										<div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
											<span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{file.name}</span>
											<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
											{status === 'classifying' && <span style={{ fontSize: '0.8rem', color: 'var(--brand-primary)' }}>⟳ Classifying...</span>}
											{classResult && (
												<span style={{
													fontSize: '0.75rem', padding: '2px 10px', borderRadius: '12px',
													background: classResult.confidence >= 70 ? 'var(--success-bg, #e6f9e9)' : 'var(--warning-bg, #fff3e0)',
													color: classResult.confidence >= 70 ? 'var(--success)' : 'var(--warning)',
													fontWeight: 600,
												}}>
													{classResult.predicted_type} ({classResult.confidence}%)
												</span>
											)}
										</div>
									)}
								</div>

								<div style={{ display: 'flex', gap: '8px' }}>
									<input type="file" accept=".pdf,.xlsx,.xls,.csv" style={{ display: 'none' }}
										ref={el => fileRefs.current[slot.key] = el}
										onChange={e => handleFileSelect(slot.key, e.target.files[0])} />
									<button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}
										onClick={() => fileRefs.current[slot.key]?.click()}>
										{file ? 'Replace' : 'Upload'}
									</button>
								</div>
							</div>
						</div>
					);
				})}
			</div>

			<div style={{ display: 'flex', gap: '16px', justifyContent: 'space-between' }}>
				<button className="btn btn-secondary" onClick={handleDemoUpload} disabled={loading}
					style={{ background: 'var(--brand-light)', borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}>
					{loading ? '⏳ Loading...' : 'Quick Demo (Pre-loaded Profile)'}
				</button>
				<button className="btn btn-primary" onClick={handleProceed} disabled={!canProceed()}>
					Proceed to Classification →
				</button>
			</div>
		</div>
	);
}
