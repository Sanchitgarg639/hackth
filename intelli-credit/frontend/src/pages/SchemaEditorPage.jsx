import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCredit } from '../context/CreditContext';

const DATA_TYPES = ['String', 'Number', 'Percentage', 'Date', 'Boolean', 'Array'];

const DEFAULT_SCHEMAS = {
	'ALM': [
		{ name: 'maturity_buckets', type: 'Array', required: true, desc: 'Maturity bucket breakdown' },
		{ name: 'asset_liability_gap', type: 'Number', required: true, desc: 'Gap between assets and liabilities' },
		{ name: 'liquidity_ratio', type: 'Percentage', required: true, desc: 'Liquidity coverage ratio' },
		{ name: 'nsfr', type: 'Percentage', required: false, desc: 'Net Stable Funding Ratio' },
		{ name: 'lcr', type: 'Percentage', required: false, desc: 'Liquidity Coverage Ratio' },
		{ name: 'concentration_risk', type: 'Number', required: false, desc: 'Concentration risk metric' },
	],
	'Shareholding Pattern': [
		{ name: 'promoter_holding_pct', type: 'Percentage', required: true, desc: 'Promoter shareholding %' },
		{ name: 'public_holding_pct', type: 'Percentage', required: true, desc: 'Public shareholding %' },
		{ name: 'institutional_holding_pct', type: 'Percentage', required: false, desc: 'Institutional holding %' },
		{ name: 'total_shareholders', type: 'Number', required: false, desc: 'Total number of shareholders' },
		{ name: 'pledged_shares_pct', type: 'Percentage', required: true, desc: 'Pledged shares as % of total' },
		{ name: 'top10_shareholders', type: 'Array', required: false, desc: 'Top 10 shareholders list' },
	],
	'Borrowing Profile': [
		{ name: 'total_borrowings', type: 'Number', required: true, desc: 'Total borrowings in ₹ Cr' },
		{ name: 'secured_loans', type: 'Number', required: true, desc: 'Secured loans amount' },
		{ name: 'unsecured_loans', type: 'Number', required: true, desc: 'Unsecured loans amount' },
		{ name: 'bank_wise_exposure', type: 'Array', required: false, desc: 'Bank-wise exposure breakdown' },
		{ name: 'weighted_avg_cost_of_funds', type: 'Percentage', required: false, desc: 'Weighted avg cost of funds' },
		{ name: 'debt_maturity_profile', type: 'Array', required: false, desc: 'Debt maturity profile' },
		{ name: 'npa_ratio', type: 'Percentage', required: true, desc: 'NPA ratio' },
	],
	'Annual Report': [
		{ name: 'revenue', type: 'Number', required: true, desc: 'Revenue from operations' },
		{ name: 'ebitda', type: 'Number', required: true, desc: 'EBITDA' },
		{ name: 'pat', type: 'Number', required: true, desc: 'Profit After Tax' },
		{ name: 'pat_margin_pct', type: 'Percentage', required: false, desc: 'PAT margin %' },
		{ name: 'total_assets', type: 'Number', required: true, desc: 'Total assets' },
		{ name: 'net_worth', type: 'Number', required: true, desc: 'Net worth / shareholder equity' },
		{ name: 'debt_equity_ratio', type: 'Number', required: true, desc: 'Debt to equity ratio' },
		{ name: 'current_ratio', type: 'Number', required: true, desc: 'Current ratio' },
		{ name: 'interest_coverage_ratio', type: 'Number', required: false, desc: 'Interest coverage ratio' },
		{ name: 'dscr', type: 'Number', required: true, desc: 'Debt Service Coverage Ratio' },
		{ name: 'roe', type: 'Percentage', required: false, desc: 'Return on Equity' },
		{ name: 'roce', type: 'Percentage', required: false, desc: 'Return on Capital Employed' },
		{ name: 'cash_from_operations', type: 'Number', required: false, desc: 'Cash flow from operations' },
	],
	'Portfolio Data': [
		{ name: 'total_portfolio_size', type: 'Number', required: true, desc: 'Total portfolio size in ₹ Cr' },
		{ name: 'stage1_pct', type: 'Percentage', required: true, desc: 'Stage 1 assets %' },
		{ name: 'stage2_pct', type: 'Percentage', required: true, desc: 'Stage 2 assets %' },
		{ name: 'stage3_pct', type: 'Percentage', required: true, desc: 'Stage 3 assets %' },
		{ name: 'gnpa_pct', type: 'Percentage', required: true, desc: 'Gross NPA %' },
		{ name: 'nnpa_pct', type: 'Percentage', required: true, desc: 'Net NPA %' },
		{ name: 'collection_efficiency', type: 'Percentage', required: false, desc: 'Collection efficiency %' },
		{ name: 'par30_pct', type: 'Percentage', required: false, desc: 'PAR 30+ %' },
		{ name: 'par90_pct', type: 'Percentage', required: false, desc: 'PAR 90+ %' },
		{ name: 'geographic_concentration', type: 'Array', required: false, desc: 'Geographic concentration data' },
	],
};

const getDefaultSchema = (docType) => {
	for (const [key, schema] of Object.entries(DEFAULT_SCHEMAS)) {
		if (docType?.toLowerCase().includes(key.toLowerCase().split(' ')[0])) {
			return schema.map(f => ({ ...f }));
		}
	}
	return [{ name: 'field_1', type: 'String', required: false, desc: '' }];
};

export default function SchemaEditorPage() {
	const { documents, schemas, setSchemas } = useCredit();
	const [localSchemas, setLocalSchemas] = useState({});
	const navigate = useNavigate();

	useEffect(() => {
		if (!documents || documents.length === 0) {
			navigate('/upload');
			return;
		}
		// Initialize schemas from AI suggestions or defaults
		const init = {};
		documents.forEach(doc => {
			if (doc.approvalStatus === 'rejected') return;
			const docType = doc.classification?.predicted_type || doc.slotKey;
			const aiSchema = doc.classification?.suggested_schema;
			init[doc.slotKey] = (aiSchema && aiSchema.length > 0) ? aiSchema : getDefaultSchema(docType);
		});
		setLocalSchemas(init);
	}, [documents, navigate]);

	const updateField = (slotKey, index, field, value) => {
		setLocalSchemas(prev => {
			const updated = { ...prev };
			updated[slotKey] = [...updated[slotKey]];
			updated[slotKey][index] = { ...updated[slotKey][index], [field]: value };
			return updated;
		});
	};

	const deleteField = (slotKey, index) => {
		setLocalSchemas(prev => ({
			...prev,
			[slotKey]: prev[slotKey].filter((_, i) => i !== index),
		}));
	};

	const addField = (slotKey) => {
		setLocalSchemas(prev => ({
			...prev,
			[slotKey]: [...(prev[slotKey] || []), { name: '', type: 'String', required: false, desc: '' }],
		}));
	};

	const resetSchema = (slotKey, docType) => {
		setLocalSchemas(prev => ({
			...prev,
			[slotKey]: getDefaultSchema(docType),
		}));
	};

	const handleConfirm = () => {
		setSchemas(localSchemas);
		navigate('/extract');
	};

	const confirmedDocs = (documents || []).filter(d => d.approvalStatus !== 'rejected');

	return (
		<div className="fade-in">
			<div className="page-header">
				<h2>Schema Editor</h2>
				<p>Define the data fields to extract from each document. Add, edit, or remove fields as needed.</p>
			</div>

			{confirmedDocs.map(doc => {
				const schema = localSchemas[doc.slotKey] || [];
				const docType = doc.classification?.predicted_type || doc.slotKey;

				return (
					<div key={doc.slotKey} className="enterprise-card" style={{ marginBottom: '24px' }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
							<h3 style={{ margin: 0, fontSize: '1rem' }}>
								{doc.filename} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— {docType}</span>
							</h3>
							<button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem' }}
								onClick={() => resetSchema(doc.slotKey, docType)}>
								🔄 Reset to Default
							</button>
						</div>

						<div style={{ overflowX: 'auto' }}>
							<table className="data-table" style={{ width: '100%' }}>
								<thead>
									<tr>
										<th>Field Name</th>
										<th>Data Type</th>
										<th>Required</th>
										<th>Description</th>
										<th style={{ width: '50px' }}></th>
									</tr>
								</thead>
								<tbody>
									{schema.map((field, i) => (
										<tr key={i}>
											<td>
												<input className="input-field" type="text" value={field.name}
													onChange={e => updateField(doc.slotKey, i, 'name', e.target.value)}
													style={{ padding: '4px 8px', fontSize: '0.85rem' }} />
											</td>
											<td>
												<select className="input-field" value={field.type}
													onChange={e => updateField(doc.slotKey, i, 'type', e.target.value)}
													style={{ padding: '4px 8px', fontSize: '0.85rem' }}>
													{DATA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
												</select>
											</td>
											<td style={{ textAlign: 'center' }}>
												<input type="checkbox" checked={field.required}
													onChange={e => updateField(doc.slotKey, i, 'required', e.target.checked)} />
											</td>
											<td>
												<input className="input-field" type="text" value={field.desc}
													onChange={e => updateField(doc.slotKey, i, 'desc', e.target.value)}
													style={{ padding: '4px 8px', fontSize: '0.85rem' }} />
											</td>
											<td>
												<button onClick={() => deleteField(doc.slotKey, i)}
													style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>✕</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						<button className="btn btn-secondary" style={{ marginTop: '8px', padding: '6px 16px', fontSize: '0.85rem' }}
							onClick={() => addField(doc.slotKey)}>
							+ Add Field
						</button>
					</div>
				);
			})}

			<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
				<button className="btn btn-secondary" onClick={() => navigate('/classify')}>← Back</button>
				<button className="btn btn-primary" onClick={handleConfirm} style={{ fontSize: '1rem', padding: '14px 28px' }}>
					Confirm & Extract
				</button>
			</div>
		</div>
	);
}
