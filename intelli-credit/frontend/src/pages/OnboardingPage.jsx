import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOnboarding, setAnalysisIdHeader } from '../api/creditApi';
import { useCredit } from '../context/CreditContext';

const SECTORS = ['Banking', 'NBFC', 'Fintech', 'Food Tech', 'Ed Tech', 'Healthcare', 'Manufacturing', 'Retail', 'Real Estate', 'Other'];
const LOAN_TYPES = ['Term Loan', 'Working Capital', 'CC Limit', 'ECB', 'NCD', 'Project Finance', 'Other'];
const COLLATERALS = ['Property', 'Equipment', 'Receivables', 'Shares', 'None'];

const CIN_REGEX = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export default function OnboardingPage() {
	const [step, setStep] = useState(1);
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState({});
	const [toast, setToast] = useState(null);
	const navigate = useNavigate();
	const { setAnalysisId, setCompanyId, setEntityDetails, setLoanDetails, reset } = useCredit();

	const [entity, setEntity] = useState({
		companyName: '', cin: '', pan: '', gstin: '',
		sector: '', subSector: '', annualTurnover: '', yearsInOperation: '',
	});

	const [loan, setLoan] = useState({
		loanType: '', loanAmount: '', tenure: '', interestRate: '',
		purpose: '', collateral: 'None',
	});

	const handleEntityChange = (field, value) => {
		setEntity(prev => ({ ...prev, [field]: value }));
		if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
	};

	const handleLoanChange = (field, value) => {
		setLoan(prev => ({ ...prev, [field]: value }));
		if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
	};

	const validateStep1 = () => {
		const errs = {};
		if (!entity.companyName.trim()) errs.companyName = 'Company name is required';
		if (entity.cin && !CIN_REGEX.test(entity.cin)) errs.cin = 'Invalid CIN format (e.g., L12345MH2000PLC123456)';
		if (entity.pan && !PAN_REGEX.test(entity.pan)) errs.pan = 'Invalid PAN format (e.g., ABCDE1234F)';
		if (!entity.sector) errs.sector = 'Please select a sector';
		setErrors(errs);
		return Object.keys(errs).length === 0;
	};

	const validateStep2 = () => {
		const errs = {};
		if (!loan.loanType) errs.loanType = 'Select a loan type';
		if (!loan.loanAmount || parseFloat(loan.loanAmount) <= 0) errs.loanAmount = 'Enter a valid loan amount';
		if (!loan.tenure || parseInt(loan.tenure) <= 0) errs.tenure = 'Enter a valid tenure';
		setErrors(errs);
		return Object.keys(errs).length === 0;
	};

	const handleNext = () => {
		if (step === 1 && validateStep1()) setStep(2);
		else if (step === 2 && validateStep2()) setStep(3);
	};

	const handleSubmit = async () => {
		setLoading(true);
		try {
			reset();
			const entityData = {
				...entity,
				annualTurnover: parseFloat(entity.annualTurnover) || 0,
				yearsInOperation: parseInt(entity.yearsInOperation) || 0,
			};
			const loanData = {
				...loan,
				loanAmount: parseFloat(loan.loanAmount) || 0,
				tenure: parseInt(loan.tenure) || 0,
				interestRate: parseFloat(loan.interestRate) || 0,
			};

			const res = await createOnboarding(entityData, loanData);
			setAnalysisId(res.data.analysisId);
			setCompanyId(res.data.companyId);
			setEntityDetails(entityData);
			setLoanDetails(loanData);
			setAnalysisIdHeader(res.data.analysisId);

			setToast({ type: 'success', message: `✓ Onboarding created — ID: ${res.data.analysisId.substring(0, 12)}...` });
			setTimeout(() => navigate('/upload'), 1000);
		} catch (err) {
			const msg = err.response?.data?.error?.message || err.message || 'Onboarding failed';
			setToast({ type: 'error', message: msg });
		} finally {
			setLoading(false);
		}
	};

	const renderInput = (label, field, obj, handler, type = 'text', opts = {}) => (
		<div className="input-group">
			<label>{label} {opts.required && <span style={{ color: 'var(--danger)' }}>*</span>}</label>
			{type === 'select' ? (
				<select className="input-field" value={obj[field]} onChange={e => handler(field, e.target.value)}>
					<option value="">Select...</option>
					{opts.options?.map(o => <option key={o} value={o}>{o}</option>)}
				</select>
			) : type === 'textarea' ? (
				<textarea className="input-field" value={obj[field]} onChange={e => handler(field, e.target.value)}
					maxLength={opts.maxLength || 300} rows={3} placeholder={opts.placeholder || ''} />
			) : (
				<input className="input-field" type={type} value={obj[field]}
					onChange={e => handler(field, e.target.value)} placeholder={opts.placeholder || ''}
					min={opts.min} step={opts.step} />
			)}
			{errors[field] && <span style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px' }}>{errors[field]}</span>}
		</div>
	);

	return (
		<div className="fade-in">
			{toast && (
				<div className={`toast toast-${toast.type}`} onAnimationEnd={() => setTimeout(() => setToast(null), 3000)}>
					{toast.message}
				</div>
			)}

			<div className="page-header">
				<h2>🏢 Entity Onboarding</h2>
				<p>Provide company and loan details to begin the credit appraisal process</p>
			</div>

			{/* Sub-stepper */}
			<div className="enterprise-card" style={{ marginBottom: '24px', padding: '16px 24px' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
					{['Entity Details', 'Loan Details', 'Review & Confirm'].map((label, i) => (
						<div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
							<div style={{
								width: '32px', height: '32px', borderRadius: '50%', display: 'flex',
								alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700,
								background: step > i + 1 ? 'var(--success)' : step === i + 1 ? 'var(--brand-primary)' : 'var(--bg-subtle)',
								color: step >= i + 1 ? '#fff' : 'var(--text-muted)',
								transition: 'all 0.3s ease',
							}}>
								{step > i + 1 ? '✓' : i + 1}
							</div>
							<span style={{ fontWeight: step === i + 1 ? 700 : 400, color: step === i + 1 ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '0.9rem' }}>{label}</span>
							{i < 2 && <div style={{ width: '40px', height: '2px', background: step > i + 1 ? 'var(--success)' : 'var(--border-default)' }} />}
						</div>
					))}
				</div>
			</div>

			{/* Step 1: Entity Details */}
			{step === 1 && (
				<div className="enterprise-card">
					<h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: 600 }}>📋 Entity Details</h3>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
						{renderInput('Company Name', 'companyName', entity, handleEntityChange, 'text', { required: true, placeholder: 'e.g., Tata Steel Ltd' })}
						{renderInput('CIN (Corporate Identification Number)', 'cin', entity, handleEntityChange, 'text', { placeholder: 'e.g., L12345MH2000PLC123456' })}
						{renderInput('PAN', 'pan', entity, handleEntityChange, 'text', { placeholder: 'e.g., ABCDE1234F' })}
						{renderInput('GSTIN', 'gstin', entity, handleEntityChange, 'text', { placeholder: 'e.g., 27AAPCT1234A1Z5' })}
						{renderInput('Sector', 'sector', entity, handleEntityChange, 'select', { required: true, options: SECTORS })}
						{renderInput('Sub-Sector', 'subSector', entity, handleEntityChange, 'text', { placeholder: 'e.g., Steel Manufacturing' })}
						{renderInput('Annual Turnover (₹ Crores)', 'annualTurnover', entity, handleEntityChange, 'number', { placeholder: '0', min: 0, step: 0.01 })}
						{renderInput('Years in Operation', 'yearsInOperation', entity, handleEntityChange, 'number', { placeholder: '0', min: 0 })}
					</div>
					<div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
						<button className="btn btn-primary" onClick={handleNext}>Next → Loan Details</button>
					</div>
				</div>
			)}

			{/* Step 2: Loan Details */}
			{step === 2 && (
				<div className="enterprise-card">
					<h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: 600 }}>💰 Loan Details</h3>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
						{renderInput('Loan Type', 'loanType', loan, handleLoanChange, 'select', { required: true, options: LOAN_TYPES })}
						{renderInput('Loan Amount Requested (₹ Crores)', 'loanAmount', loan, handleLoanChange, 'number', { required: true, placeholder: '0', min: 0, step: 0.01 })}
						{renderInput('Tenure (Months)', 'tenure', loan, handleLoanChange, 'number', { required: true, placeholder: '12', min: 1 })}
						{renderInput('Interest Rate (% p.a.)', 'interestRate', loan, handleLoanChange, 'number', { placeholder: '10.5', min: 0, step: 0.01 })}
						{renderInput('Purpose of Loan', 'purpose', loan, handleLoanChange, 'textarea', { placeholder: 'Brief description of loan purpose...', maxLength: 300 })}
						{renderInput('Collateral Available', 'collateral', loan, handleLoanChange, 'select', { options: COLLATERALS })}
					</div>
					<div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
						<button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
						<button className="btn btn-primary" onClick={handleNext}>Next → Review</button>
					</div>
				</div>
			)}

			{/* Step 3: Review & Confirm */}
			{step === 3 && (
				<div className="enterprise-card">
					<h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: 600 }}>✅ Review & Confirm</h3>
					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
						<div>
							<h4 style={{ color: 'var(--brand-primary)', marginBottom: '12px' }}>Entity Details</h4>
							<table className="data-table">
								<tbody>
									{[
										['Company Name', entity.companyName],
										['CIN', entity.cin || '—'],
										['PAN', entity.pan || '—'],
										['GSTIN', entity.gstin || '—'],
										['Sector', entity.sector],
										['Sub-Sector', entity.subSector || '—'],
										['Annual Turnover', entity.annualTurnover ? `₹${entity.annualTurnover} Cr` : '—'],
										['Years in Operation', entity.yearsInOperation || '—'],
									].map(([k, v]) => (
										<tr key={k}><td>{k}</td><td style={{ fontWeight: 600 }}>{v}</td></tr>
									))}
								</tbody>
							</table>
						</div>
						<div>
							<h4 style={{ color: 'var(--brand-primary)', marginBottom: '12px' }}>Loan Details</h4>
							<table className="data-table">
								<tbody>
									{[
										['Loan Type', loan.loanType],
										['Loan Amount', `₹${loan.loanAmount} Cr`],
										['Tenure', `${loan.tenure} months`],
										['Interest Rate', loan.interestRate ? `${loan.interestRate}% p.a.` : '—'],
										['Purpose', loan.purpose || '—'],
										['Collateral', loan.collateral],
									].map(([k, v]) => (
										<tr key={k}><td>{k}</td><td style={{ fontWeight: 600 }}>{v}</td></tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
					<div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
						<button className="btn btn-secondary" onClick={() => setStep(2)}>← Edit</button>
						<button className="btn btn-primary" onClick={handleSubmit} disabled={loading}
							style={{ fontSize: '1rem', padding: '14px 28px' }}>
							{loading ? '⏳ Creating...' : '🚀 Begin Analysis'}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
