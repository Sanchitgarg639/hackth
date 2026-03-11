import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCredit } from '../context/CreditContext';

const DOC_TYPE_OPTIONS = ['ALM', 'Shareholding Pattern', 'Borrowing Profile', 'Annual Report', 'Portfolio Data', 'Unknown'];

export default function ClassificationReviewPage() {
	const { documents, classificationResults, setDocuments } = useCredit();
	const [fileStatuses, setFileStatuses] = useState({});
	const [overrides, setOverrides] = useState({});
	const navigate = useNavigate();

	useEffect(() => {
		if (!documents || documents.length === 0) {
			navigate('/upload');
			return;
		}
		// Auto-set statuses based on confidence
		const initial = {};
		documents.forEach(doc => {
			const cls = classificationResults[doc.slotKey] || doc.classification || {};
			const conf = cls.confidence || 0;
			initial[doc.slotKey] = conf >= 70 ? 'confirmed' : 'needs_review';
		});
		setFileStatuses(initial);
	}, [documents, classificationResults, navigate]);

	const handleApprove = (slotKey) => {
		setFileStatuses(prev => ({ ...prev, [slotKey]: 'confirmed' }));
	};

	const handleReject = (slotKey) => {
		setFileStatuses(prev => ({ ...prev, [slotKey]: 'rejected' }));
	};

	const handleOverride = (slotKey, newType) => {
		setOverrides(prev => ({ ...prev, [slotKey]: newType }));
	};

	const canProceed = () => {
		return documents.every(doc =>
			fileStatuses[doc.slotKey] === 'confirmed' || fileStatuses[doc.slotKey] === 'rejected'
		);
	};

	const handleProceed = () => {
		const updatedDocs = documents.map(doc => ({
			...doc,
			classification: {
				...(classificationResults[doc.slotKey] || doc.classification || {}),
				predicted_type: overrides[doc.slotKey] || (classificationResults[doc.slotKey] || doc.classification || {}).predicted_type,
			},
			approvalStatus: fileStatuses[doc.slotKey],
		})).filter(doc => doc.approvalStatus !== 'rejected');
		setDocuments(updatedDocs);
		navigate('/schema');
	};

	const getBadge = (status) => {
		if (status === 'confirmed') return { bg: 'var(--success-bg, #e6f9e9)', color: 'var(--success)', text: 'CONFIRMED' };
		if (status === 'rejected') return { bg: 'var(--danger-bg, #fde8e8)', color: 'var(--danger)', text: 'REJECTED' };
		return { bg: 'var(--warning-bg, #fff3e0)', color: 'var(--warning)', text: 'NEEDS REVIEW' };
	};

	if (!documents || documents.length === 0) return null;

	return (
		<div className="fade-in">
			<div className="page-header">
				<h2>🔍 Classification Review</h2>
				<p>Review AI document classifications. Override incorrect predictions before extraction.</p>
			</div>

			<div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
				{documents.map(doc => {
					const cls = classificationResults[doc.slotKey] || doc.classification || {};
					const status = fileStatuses[doc.slotKey] || 'needs_review';
					const badge = getBadge(status);
					const displayType = overrides[doc.slotKey] || cls.predicted_type || 'Unknown';

					return (
						<div key={doc.slotKey} className="enterprise-card" style={{
							borderLeft: `4px solid ${badge.color}`,
							opacity: status === 'rejected' ? 0.5 : 1,
							transition: 'all 0.3s ease',
						}}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
								<div style={{ flex: 1, minWidth: '200px' }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
										<span style={{ fontWeight: 700, fontSize: '1rem' }}>📄 {doc.filename}</span>
										<span style={{
											fontSize: '0.75rem', padding: '2px 10px', borderRadius: '12px',
											background: badge.bg, color: badge.color, fontWeight: 700,
										}}>
											{badge.text}
										</span>
									</div>
									<div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
										AI Prediction: <strong>{cls.predicted_type || 'Unknown'}</strong>
										{cls.confidence != null && (
											<span style={{
												marginLeft: '8px',
												color: cls.confidence >= 70 ? 'var(--success)' : 'var(--warning)',
												fontWeight: 600,
											}}>
												({cls.confidence}% confidence)
											</span>
										)}
									</div>
									{cls.reasoning && (
										<div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{cls.reasoning}</div>
									)}
								</div>

								<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
									<select className="input-field" style={{ width: '200px', padding: '6px 12px' }}
										value={displayType} onChange={e => handleOverride(doc.slotKey, e.target.value)}>
										{DOC_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
									</select>
									<button className="btn btn-primary" style={{ padding: '6px 16px', background: 'var(--success)' }}
										onClick={() => handleApprove(doc.slotKey)} disabled={status === 'confirmed'}>
										✓ Approve
									</button>
									<button className="btn btn-secondary" style={{ padding: '6px 16px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
										onClick={() => handleReject(doc.slotKey)} disabled={status === 'rejected'}>
										✕ Reject
									</button>
								</div>
							</div>
						</div>
					);
				})}
			</div>

			<div style={{ display: 'flex', justifyContent: 'space-between' }}>
				<button className="btn btn-secondary" onClick={() => navigate('/upload')}>← Back to Upload</button>
				<button className="btn btn-primary" onClick={handleProceed} disabled={!canProceed()}>
					Proceed to Schema Editor →
				</button>
			</div>
		</div>
	);
}
