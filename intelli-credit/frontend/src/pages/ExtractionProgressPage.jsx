import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCredit } from '../context/CreditContext';
import { startAnalysis, uploadFile } from '../api/creditApi';

export default function ExtractionProgressPage() {
	const { documents, schemas, analysisId, entityDetails, setExtractedData, setFileId, setCompanyId, setAnalysisId: ctxSetAnalysisId, setAnalysisStatus, companyId, fileId } = useCredit();
	const [extractions, setExtractions] = useState({});
	const [approvals, setApprovals] = useState({});
	const [overrides, setOverrides] = useState({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const hasStarted = useRef(false);
	const navigate = useNavigate();

	useEffect(() => {
		if (!documents || documents.length === 0) {
			navigate('/upload');
			return;
		}
		if (hasStarted.current) return;
		hasStarted.current = true;
		simulateExtraction();
	}, [documents, navigate]);

	const simulateExtraction = async () => {
		setLoading(true);
		// For each confirmed document, simulate extraction with schema fields
		const confirmedDocs = documents.filter(d => d.approvalStatus !== 'rejected');

		for (const doc of confirmedDocs) {
			const schema = schemas[doc.slotKey] || [];

			// Simulate progressive extraction
			const extracted = {};
			for (let i = 0; i < schema.length; i++) {
				await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
				const field = schema[i];
				const confidence = 50 + Math.floor(Math.random() * 50);
				const value = _generateStubValue(field);

				extracted[field.name] = {
					value,
					confidence,
					raw_text: `Extracted from document: ${value}`,
				};

				setExtractions(prev => ({
					...prev,
					[doc.slotKey]: { ...prev[doc.slotKey], ...{ [field.name]: extracted[field.name] } }
				}));
			}
		}

		// Also trigger the legacy upload → extraction if we have files and a company
		if (confirmedDocs.length > 0 && entityDetails) {
			try {
				const files = confirmedDocs.filter(d => d.file).map(d => d.file);
				if (files.length > 0) {
					const res = await uploadFile(files, entityDetails.companyName || 'Company', entityDetails.sector || '', entityDetails.gstin || '', entityDetails.pan || '');
					setCompanyId(res.data.companyId);
					setFileId(res.data.fileId);
					setExtractedData(res.data.extractedData);
				}
			} catch (err) {
				console.warn('Legacy upload/extraction failed:', err.message);
			}
		}
		setLoading(false);
	};

	const handleOverride = (slotKey, fieldName, newValue) => {
		setOverrides(prev => ({
			...prev,
			[slotKey]: { ...(prev[slotKey] || {}), [fieldName]: newValue }
		}));
	};

	const handleApprove = (slotKey) => {
		setApprovals(prev => ({ ...prev, [slotKey]: true }));
	};

	const allApproved = () => {
		const confirmedDocs = documents.filter(d => d.approvalStatus !== 'rejected');
		return confirmedDocs.every(d => approvals[d.slotKey]);
	};

	const handleProceed = async () => {
		setError('');
		if (companyId && fileId) {
			try {
				const res = await startAnalysis(fileId, companyId);
				ctxSetAnalysisId(prev => prev || res.data.analysisId);
				setAnalysisStatus('queued');
				navigate('/analyze');
			} catch (err) {
				setError('Failed to start analysis: ' + (err.response?.data?.error?.message || err.message));
			}
		} else if (analysisId) {
			try {
				const res = await startAnalysis(null, null, analysisId);
				ctxSetAnalysisId(prev => prev || res.data.analysisId);
				setAnalysisStatus('queued');
				navigate('/analyze');
			} catch (err) {
				setError('Failed to start analysis: ' + (err.response?.data?.error?.message || err.message));
			}
		} else {
			// Navigate to analyze even without legacy pipeline
			navigate('/analyze');
		}
	};

	const confirmedDocs = (documents || []).filter(d => d.approvalStatus !== 'rejected');

	return (
		<div className="fade-in">
			<div className="page-header">
				<h2>⚙️ Extraction Progress</h2>
				<p>AI is extracting data from your documents based on the confirmed schemas</p>
			</div>

			{error && (
				<div style={{ padding: '12px 16px', background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', marginBottom: '16px' }}>
					⚠ {error}
				</div>
			)}

			{confirmedDocs.map(doc => {
				const schema = schemas[doc.slotKey] || [];
				const extracted = extractions[doc.slotKey] || {};
				const approved = approvals[doc.slotKey];
				const progress = schema.length > 0 ? Math.round((Object.keys(extracted).length / schema.length) * 100) : 0;

				return (
					<div key={doc.slotKey} className="enterprise-card" style={{ marginBottom: '20px', opacity: approved ? 0.8 : 1 }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
							<h3 style={{ margin: 0, fontSize: '1rem' }}>
								📄 {doc.filename}
								{approved && <span style={{ marginLeft: '8px', color: 'var(--success)' }}>✅ Approved</span>}
							</h3>
							<span style={{ fontSize: '0.85rem', fontWeight: 600, color: progress === 100 ? 'var(--success)' : 'var(--brand-primary)' }}>
								{progress}%
							</span>
						</div>

						{/* Progress bar */}
						<div className="progress-bar-container" style={{ marginBottom: '16px' }}>
							<div className="progress-bar" style={{ width: `${progress}%`, transition: 'width 0.5s ease' }} />
						</div>

						{/* Extracted fields table */}
						{Object.keys(extracted).length > 0 && (
							<table className="data-table" style={{ width: '100%' }}>
								<thead>
									<tr>
										<th>Field</th>
										<th>Extracted Value</th>
										<th>Confidence</th>
										<th>Status</th>
									</tr>
								</thead>
								<tbody>
									{schema.map(field => {
										const ex = extracted[field.name];
										if (!ex) return (
											<tr key={field.name} style={{ opacity: 0.4 }}>
												<td>{field.name}</td>
												<td>—</td>
												<td>—</td>
												<td>⏳ Pending...</td>
											</tr>
										);

										const override = overrides[doc.slotKey]?.[field.name];
										const displayValue = override !== undefined ? override : ex.value;
										const isLow = ex.confidence < 80;
										const isNotFound = ex.value === null || ex.value === '' || ex.value === 'N/A';

										return (
											<tr key={field.name} style={{
												background: isNotFound ? 'var(--danger-bg, #fde8e8)' : isLow ? 'var(--warning-bg, #fff3e0)' : '',
											}}>
												<td style={{ fontWeight: field.required ? 700 : 400 }}>
													{field.name} {field.required && <span style={{ color: 'var(--danger)' }}>*</span>}
												</td>
												<td>
													<input className="input-field" type="text"
														value={displayValue ?? ''}
														onChange={e => handleOverride(doc.slotKey, field.name, e.target.value)}
														style={{ padding: '4px 8px', fontSize: '0.85rem', border: isNotFound ? '2px solid var(--danger)' : isLow ? '2px solid var(--warning)' : '' }}
													/>
												</td>
												<td>
													<span style={{
														fontWeight: 600,
														color: ex.confidence >= 80 ? 'var(--success)' : ex.confidence >= 50 ? 'var(--warning)' : 'var(--danger)',
													}}>
														{ex.confidence}%
													</span>
												</td>
												<td>
													{isNotFound ? (
														<span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.85rem' }}>❌ Not Found</span>
													) : isLow ? (
														<span style={{ color: 'var(--warning)', fontWeight: 600, fontSize: '0.85rem' }}>⚠ Low Conf.</span>
													) : (
														<span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>✓ OK</span>
													)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						)}

						{!approved && progress === 100 && (
							<button className="btn btn-primary" style={{ marginTop: '12px' }}
								onClick={() => handleApprove(doc.slotKey)}>
								✅ Approve Extraction
							</button>
						)}
					</div>
				);
			})}

			<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
				<button className="btn btn-secondary" onClick={() => navigate('/schema')}>← Back</button>
				<button className="btn btn-primary" onClick={handleProceed}
					disabled={!allApproved() && loading}
					style={{ fontSize: '1rem', padding: '14px 28px' }}>
					🚀 Proceed to Analysis
				</button>
			</div>
		</div>
	);
}

function _generateStubValue(field) {
	const t = field.type;
	if (t === 'Number') return Math.round(Math.random() * 10000) / 100;
	if (t === 'Percentage') return Math.round(Math.random() * 10000) / 100;
	if (t === 'Boolean') return Math.random() > 0.5;
	if (t === 'Date') return '2024-03-31';
	if (t === 'Array') return [];
	return 'Sample Data';
}
