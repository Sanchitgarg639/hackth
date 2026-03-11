import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCredit } from '../context/CreditContext';
import {
	getReport, generateReport, getTriangulation, getSwot,
	downloadXlsx, getPipelineStatus, downloadTriangulationPdf
} from '../api/creditApi';
import { formatCurrency } from '../utils/formatters';

import ScoreGauge from '../components/ScoreGauge';
import ExplainabilityPanel from '../components/ExplainabilityPanel';
import FactorScoreCard from '../components/FactorScoreCard';
import CAMPreview from '../components/CAMPreview';
import TriangulationSection from '../components/TriangulationSection';
import SwotGrid from '../components/SwotGrid';
import ReasoningAccordion from '../components/ReasoningAccordion';
import ResearchTracksSummary from '../components/ResearchTracksSummary';

export default function ReportPage() {
	const {
		companyId, analysisId, riskData, camSummary, analysisStatus, reset,
		entityDetails, loanDetails, triangulationResults, swotAnalysis,
		reasoningBreakdown, researchTracks,
		setTriangulationResults, setSwotAnalysis, setReasoningBreakdown, setResearchTracks,
	} = useCredit();
	const navigate = useNavigate();
	const [report, setReport] = useState(null);
	const [loading, setLoading] = useState(true);
	const [generatingDoc, setGeneratingDoc] = useState(false);
	const [downloadingXlsx, setDownloadingXlsx] = useState(false);
	const [expandedDoc, setExpandedDoc] = useState(null);
	const [toast, setToast] = useState(null);

	useEffect(() => {
		if (!analysisId && analysisStatus !== 'complete') {
			// Allow viewing the report if riskData is available (from demo flow)
			if (!riskData) {
				navigate('/');
				return;
			}
		}

		const fetchAll = async () => {
			// 1. Fetch main report
			try {
				const res = await getReport(analysisId);
				setReport(res.data);
			} catch {
				setReport({
					companyName: entityDetails?.companyName || 'Company',
					riskScore: riskData?.score || 0,
					riskDetails: riskData || {},
					camUrl: '/static/sample-cam.pdf',
					summary: camSummary || {},
					extractedData: {},
					researchFindings: {},
				});
			} finally {
				setLoading(false);
			}

			// 2. Fetch triangulation (if not already in context)
			if (!triangulationResults && analysisId) {
				try {
					const res = await getTriangulation(analysisId);
					setTriangulationResults(res.data);
				} catch {
					// Triangulation unavailable — not fatal
				}
			}

			// 3. Fetch SWOT (if not already in context)
			if (!swotAnalysis && analysisId) {
				try {
					const res = await getSwot(analysisId);
					setSwotAnalysis(res.data);
				} catch {
					// SWOT unavailable — not fatal
				}
			}
		};

		fetchAll();
	}, [analysisId, analysisStatus, navigate, riskData, camSummary, entityDetails]);

	const handleGenerateDoc = async () => {
		if (report?.camUrl && report.camUrl !== '/static/sample-cam.pdf') {
			const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
			window.open(`${baseUrl}${report.camUrl}`, '_blank');
			return;
		}
		setGeneratingDoc(true);
		try {
			const res = await generateReport(analysisId);
			const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
			window.open(`${baseUrl}${res.data.downloadUrl}`, '_blank');
			setReport(prev => ({ ...prev, camUrl: res.data.downloadUrl }));
		} catch (err) {
			setToast({ type: 'error', message: 'Could not generate report: ' + err.message });
		} finally {
			setGeneratingDoc(false);
		}
	};

	const handleDownloadXlsx = async () => {
		setDownloadingXlsx(true);
		try {
			const res = await downloadXlsx(analysisId);
			const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `IntelliCredit_${data.companyName || 'Report'}_Data.xlsx`;
			a.click();
			URL.revokeObjectURL(url);
		} catch {
			setToast({ type: 'error', message: 'XLSX export failed — try again' });
		} finally {
			setDownloadingXlsx(false);
		}
	};

	const handleDownloadTriangulationPdf = async () => {
		try {
			const res = await downloadTriangulationPdf(analysisId);
			const blob = new Blob([res.data], { type: 'application/pdf' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `IntelliCredit_Triangulation_Report.pdf`;
			a.click();
			URL.revokeObjectURL(url);
		} catch {
			// Generate simple text version as fallback
			const content = `Intelli-Credit Triangulation Report\n\n${JSON.stringify(triangulationResults || {}, null, 2)}`;
			const blob = new Blob([content], { type: 'text/plain' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url; a.download = 'Triangulation_Report.txt'; a.click();
			URL.revokeObjectURL(url);
		}
	};

	if (loading) {
		return (
			<div className="page-container">
				<div className="skeleton skeleton-card" style={{ marginBottom: '20px' }} />
				<div className="skeleton skeleton-card" style={{ marginBottom: '20px' }} />
				<div className="skeleton skeleton-card" />
			</div>
		);
	}

	const data = report || {};
	const risk = data.riskDetails || riskData || {};
	const score = risk.score || data.riskScore || 0;
	const grade = risk.grade || risk.Grade || 'Not Graded';
	const decision = risk.decision || risk.Decision || 'REVIEW';

	// Factor scores
	const calcFactor = (val) => Math.min(100, Math.max(0, Math.round(val)));
	const finScore = calcFactor(60 + (30 * (1 - (risk.pd || 0))));
	const qualScore = calcFactor(20 * (data.qualitativeAssessment?.managementQualityRating || 3.5));
	let gstScore = 80;
	let resScore = 75;
	if (data.extractedData?.crossVerification?.variancePercent > 10) gstScore -= 30;
	if (data.researchFindings?.critical_count > 0) resScore -= 25;

	// Derived data
	const companyName = entityDetails?.companyName || data.companyName || 'Company';
	const loanAsk = loanDetails?.loanAmount ? `₹${loanDetails.loanAmount} Cr` : '—';
	const reasoningData = reasoningBreakdown || risk.reasoning_breakdown || [];
	const verdictData = risk.verdict || null;
	const swotData = swotAnalysis;
	const triData = triangulationResults;
	const researchData = data.researchFindings || {};
	const researchTracksData = researchTracks || researchData.tracks ? { tracks: researchData.tracks || researchTracks } : null;

	// Extracted docs for section 7
	const extractedDocsList = data.documentsExtracted || [];

	return (
		<div className="fade-in">
			{toast && (
				<div className={`toast toast-${toast.type}`} onAnimationEnd={() => setTimeout(() => setToast(null), 3000)}>
					{toast.message}
				</div>
			)}

			<div className="page-header">
				<h2>📊 Credit Appraisal Report</h2>
				<p>Full analysis complete — all 4 stages processed</p>
			</div>

			{/* ── SECTION 1: Executive Summary ─────────────────────── */}
			<div className="enterprise-card" style={{ marginBottom: '24px' }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
					<div style={{ flex: 1, minWidth: '200px' }}>
						<h3 style={{ margin: '0 0 4px', fontSize: '1.3rem' }}>{companyName}</h3>
						<div style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>
							{entityDetails?.sector && <span style={{ marginRight: '12px' }}>🏭 {entityDetails.sector}</span>}
							{loanDetails?.loanType && <span style={{ marginRight: '12px' }}>💼 {loanDetails.loanType}</span>}
							{loanAsk !== '—' && <span>💰 Loan Ask: <strong>{loanAsk}</strong></span>}
						</div>
						<div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
							<div>
								<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Grade</div>
								<div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{grade}</div>
							</div>
							<div>
								<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recommended Limit</div>
								<div style={{ fontWeight: 700, fontSize: '1rem' }}>
									{risk.recommendedLimit ? formatCurrency(risk.recommendedLimit) : '—'}
								</div>
							</div>
							<div>
								<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Interest Rate Band</div>
								<div style={{ fontWeight: 700, fontSize: '1rem' }}>{risk.suggestedInterestRate || '—'}</div>
							</div>
						</div>
					</div>

					<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
						<ScoreGauge score={score} />
						<span style={{
							padding: '6px 20px', borderRadius: '20px', fontWeight: 700, fontSize: '1rem',
							background: decision === 'APPROVE' ? 'var(--success)' : decision === 'REJECT' ? 'var(--danger)' : 'var(--warning)',
							color: '#fff',
						}}>
							{decision}
						</span>
					</div>
				</div>
			</div>

			{/* ── SECTION 2: Triangulation Alerts ─────────────────── */}
			<TriangulationSection triangulationResults={triData} />

			{/* ── SECTION 3: SWOT Analysis ─────────────────────────── */}
			<SwotGrid swotAnalysis={swotData} />

			{/* ── SECTION 4: 5Cs Risk Breakdown ────────────────────── */}
			{(data.qualitativeAssessment || risk.drivers) && (
				<div className="enterprise-card" style={{ marginBottom: '24px' }}>
					<h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>🏅 5Cs Risk Breakdown</h3>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
						{[
							{ label: 'Character', score: qualScore, desc: 'Management & governance' },
							{ label: 'Capacity', score: finScore, desc: 'Revenue & repayment ability' },
							{ label: 'Capital', score: gstScore, desc: 'Net worth & equity' },
							{ label: 'Collateral', score: loanDetails?.collateral !== 'None' ? 75 : 40, desc: 'Security coverage' },
							{ label: 'Conditions', score: resScore, desc: 'Market & regulatory environment' },
						].map(c => (
							<div key={c.label} style={{ textAlign: 'center' }}>
								<FactorScoreCard score={c.score} label={c.label} />
								<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{c.desc}</div>
								<div className="progress-bar-container" style={{ marginTop: '6px' }}>
									<div className="progress-bar" style={{ width: `${c.score}%` }} />
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* ── SECTION 5: Reasoning Engine Breakdown ────────────── */}
			<ReasoningAccordion reasoningBreakdown={reasoningData} verdict={verdictData} />

			{/* ── SECTION 6: Secondary Research ────────────────────── */}
			<ResearchTracksSummary
				researchFindings={researchData}
				researchTracks={researchTracksData?.tracks || null}
			/>

			{/* ── SECTION 7: Extracted Data Tables ─────────────────── */}
			{extractedDocsList.length > 0 && (
				<div className="enterprise-card" style={{ marginBottom: '24px' }}>
					<h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>📂 Extracted Data Tables</h3>
					{extractedDocsList.map((doc, i) => (
						<div key={i} style={{ marginBottom: '12px' }}>
							<button
								style={{
									width: '100%', padding: '10px 14px', background: 'var(--bg-subtle)',
									border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)',
									cursor: 'pointer', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem',
								}}
								onClick={() => setExpandedDoc(expandedDoc === i ? null : i)}
							>
								📄 {doc.type || doc.filename || `Document ${i + 1}`}  {expandedDoc === i ? '▲' : '▼'}
							</button>
							{expandedDoc === i && (
								<table className="data-table" style={{ width: '100%', marginTop: '4px' }}>
									<thead><tr><th>Field</th><th>Value</th><th>Confidence</th></tr></thead>
									<tbody>
										{Object.entries(doc.extractedData || {}).map(([field, val]) => (
											<tr key={field}>
												<td>{field}</td>
												<td>{typeof val === 'object' ? String(val.value ?? '') : String(val)}</td>
												<td>{typeof val === 'object' ? `${val.confidence || '—'}%` : '—'}</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</div>
					))}
				</div>
			)}

			{/* ── SECTION 8: Downloads ──────────────────────────────── */}
			<div className="enterprise-card" style={{ marginBottom: '24px' }}>
				<h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>📥 Downloads</h3>
				<div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
					<button className="btn btn-primary" onClick={handleGenerateDoc} disabled={generatingDoc}
						style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}>
						📄 {generatingDoc ? 'Generating...' : 'Download Full Report (DOCX)'}
					</button>
					<button className="btn btn-secondary" onClick={handleDownloadXlsx} disabled={downloadingXlsx}
						style={{
							display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
							background: 'var(--brand-light)', borderColor: '#217346', color: '#217346'
						}}>
						📊 {downloadingXlsx ? 'Exporting...' : 'Download Extracted Data (XLSX)'}
					</button>
					<button className="btn btn-secondary" onClick={handleDownloadTriangulationPdf}
						style={{
							display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
							borderColor: 'var(--danger)', color: 'var(--danger)'
						}}>
						⚖️ Download Triangulation Report
					</button>
				</div>
			</div>

			{/* ── CAM Preview (legacy) ──────────────────────────────── */}
			<CAMPreview camUrl={data.camUrl} summary={data.summary || camSummary} />

			{/* ── Explainability Panel (legacy) ─────────────────────── */}
			<ExplainabilityPanel risk={risk} />

			{/* ── Start New Analysis ────────────────────────────────── */}
			<div style={{ textAlign: 'center', marginTop: '32px', marginBottom: '16px' }}>
				<button className="btn btn-secondary" onClick={() => { reset(); navigate('/'); }}>
					🔄 Start New Analysis
				</button>
			</div>
		</div>
	);
}
