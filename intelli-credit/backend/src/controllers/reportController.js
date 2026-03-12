'use strict';
const path = require('path');
const fs = require('fs');
const Analysis = require('../models/Analysis');
const { callCAM, callSwot, callGenerateXlsx } = require('../services/aiClient');
const QualitativeAssessment = require('../models/QualitativeAssessment');

// ── DOCX generation ─────────────────────────────────────
const docx = require('docx');
const {
	Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
	HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
	PageBreak, Footer, Header,
} = docx;

// ── XLSX generation ─────────────────────────────────────
const ExcelJS = require('exceljs');

const REPORTS_DIR = path.join(__dirname, '..', '..', 'static', 'reports');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

/** Helper: find analysis by UUID string OR MongoDB _id */
async function findAnalysis(id, populate) {
	let q = Analysis.findOne({ analysisId: id });
	if (populate) q = q.populate('companyId');
	let doc = await q;
	if (!doc) {
		try {
			q = Analysis.findById(id);
			if (populate) q = q.populate('companyId');
			doc = await q;
		} catch { /* invalid ObjectId — ignore */ }
	}
	return doc;
}

// ═══════════════════════════════════════════════════════════
//  HELPER: Build a DOCX locally using the docx npm package
// ═══════════════════════════════════════════════════════════
function buildDocxLocally(analysis) {
	const ent = analysis.entityDetails || {};
	const loan = analysis.loanDetails || {};
	const fin = analysis.extractedData?.financials || analysis.extractedData || {};
	const ratios = analysis.extractedData?.ratios || {};
	const risk = analysis.riskDetails || {};
	const swot = analysis.swotAnalysis?.swot || analysis.swotAnalysis || {};
	const tri = analysis.triangulationResults || {};
	const reasoning = analysis.reasoningBreakdown || [];
	const covenants = analysis.extractedData?.keyCovenants || [];
	const companyName = ent.companyName || analysis.companyId?.name || 'Company';
	const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

	const fmt = (v) => v != null ? (typeof v === 'number' ? `₹${(v / 10000000).toFixed(2)} Cr` : String(v)) : '—';
	const pct = (v) => v != null ? `${Number(v).toFixed(2)}%` : '—';
	const str = (v) => v != null ? String(v) : '—';

	// ── Reusable table builder ──────────────────────────
	const headerCell = (text) => new TableCell({
		children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20, color: 'FFFFFF', font: 'Calibri' })], alignment: AlignmentType.CENTER })],
		shading: { type: ShadingType.SOLID, color: '1F4E79' },
		width: { size: 50, type: WidthType.PERCENTAGE },
	});
	const dataCell = (text, bold = false) => new TableCell({
		children: [new Paragraph({ children: [new TextRun({ text: String(text ?? '—'), size: 20, bold, font: 'Calibri' })] })],
		width: { size: 50, type: WidthType.PERCENTAGE },
	});
	const kvRow = (label, value) => new TableRow({ children: [dataCell(label, true), dataCell(value)] });

	// ── Build Document Sections ──────────────────────────
	const sections = [];

	// ── COVER PAGE ────────────────────────────────────────
	sections.push(
		new Paragraph({ spacing: { after: 600 } }),
		new Paragraph({ spacing: { after: 600 } }),
		new Paragraph({
			children: [new TextRun({ text: 'CREDIT APPRAISAL MEMORANDUM', bold: true, size: 52, color: '1F4E79', font: 'Calibri' })],
			alignment: AlignmentType.CENTER,
		}),
		new Paragraph({ spacing: { after: 200 } }),
		new Paragraph({
			children: [new TextRun({ text: companyName, bold: true, size: 40, color: '2E75B6', font: 'Calibri' })],
			alignment: AlignmentType.CENTER,
		}),
		new Paragraph({ spacing: { after: 200 } }),
		new Paragraph({
			children: [new TextRun({ text: `Date: ${dateStr}`, size: 24, color: '666666', font: 'Calibri' })],
			alignment: AlignmentType.CENTER,
		}),
		new Paragraph({
			children: [new TextRun({ text: `Analysis ID: ${analysis.analysisId || analysis._id || 'N/A'}`, size: 20, color: '999999', font: 'Calibri' })],
			alignment: AlignmentType.CENTER,
		}),
		new Paragraph({
			children: [new TextRun({ text: 'Prepared by: Intelli-Credit AI Platform', size: 20, color: '999999', font: 'Calibri' })],
			alignment: AlignmentType.CENTER,
		}),
		new Paragraph({ children: [new PageBreak()] }),
	);

	// ── SECTION 1: Company Overview ───────────────────────
	sections.push(
		new Paragraph({ text: '1. Company Overview', heading: HeadingLevel.HEADING_1 }),
		new Table({
			rows: [
				new TableRow({ children: [headerCell('Parameter'), headerCell('Details')] }),
				kvRow('Company Name', companyName),
				kvRow('Industry / Sector', str(ent.sector)),
				kvRow('GSTIN', str(ent.gstin)),
				kvRow('PAN', str(ent.pan)),
				kvRow('Incorporation Year', str(ent.incorporationYear || ent.vintage)),
				kvRow('Business Type', str(ent.entityType || ent.businessType)),
				kvRow('Address', str(ent.address)),
			],
			width: { size: 100, type: WidthType.PERCENTAGE },
		}),
		new Paragraph({ spacing: { after: 300 } }),
	);

	// ── SECTION 2: Loan Details ──────────────────────────
	sections.push(
		new Paragraph({ text: '2. Loan Details', heading: HeadingLevel.HEADING_1 }),
		new Table({
			rows: [
				new TableRow({ children: [headerCell('Parameter'), headerCell('Details')] }),
				kvRow('Amount Requested', loan.loanAmount ? `₹${loan.loanAmount} Cr` : '—'),
				kvRow('Loan Type', str(loan.loanType)),
				kvRow('Purpose', str(loan.purpose)),
				kvRow('Tenure', str(loan.tenure)),
				kvRow('Collateral', str(loan.collateral)),
				kvRow('Repayment Structure', str(loan.repaymentStructure || 'Standard EMI')),
			],
			width: { size: 100, type: WidthType.PERCENTAGE },
		}),
		new Paragraph({ spacing: { after: 300 } }),
	);

	// ── SECTION 3: Financial Summary ─────────────────────
	sections.push(
		new Paragraph({ text: '3. Financial Summary', heading: HeadingLevel.HEADING_1 }),
		new Table({
			rows: [
				new TableRow({ children: [headerCell('Metric'), headerCell('Value')] }),
				kvRow('Revenue', fmt(fin.revenue)),
				kvRow('Net Profit (PAT)', fmt(fin.pat || fin.netProfit)),
				kvRow('EBITDA', fmt(fin.ebitda)),
				kvRow('Net Worth', fmt(fin.netWorth)),
				kvRow('Total Debt', fmt(fin.totalDebt)),
				kvRow('Total Assets', fmt(fin.totalAssets)),
				kvRow('Total Liabilities', fmt(fin.totalLiabilities)),
				kvRow('Interest Expense', fmt(fin.interestExpense)),
			],
			width: { size: 100, type: WidthType.PERCENTAGE },
		}),
		new Paragraph({ spacing: { after: 200 } }),
		new Paragraph({ text: 'Financial Ratios', heading: HeadingLevel.HEADING_2 }),
		new Table({
			rows: [
				new TableRow({ children: [headerCell('Ratio'), headerCell('Value')] }),
				kvRow('Debt / Equity', ratios.debtEquity != null ? `${ratios.debtEquity}x` : '—'),
				kvRow('Current Ratio', ratios.currentRatio != null ? `${ratios.currentRatio}x` : '—'),
				kvRow('DSCR', ratios.dscr != null ? `${ratios.dscr}x` : '—'),
				kvRow('Interest Coverage', ratios.interestCoverage != null ? `${ratios.interestCoverage}x` : '—'),
				kvRow('Return on Equity', pct(ratios.returnOnEquity)),
				kvRow('Net Profit Margin', pct(ratios.netProfitMargin)),
				kvRow('Gross Margin', pct(ratios.grossMargin)),
			],
			width: { size: 100, type: WidthType.PERCENTAGE },
		}),
		new Paragraph({ spacing: { after: 300 } }),
	);

	// ── SECTION 4: Risk Assessment ───────────────────────
	const riskScore = risk.score || analysis.riskScore || 0;
	const riskGrade = risk.grade || risk.Grade || 'Not Graded';
	const riskDecision = risk.decision || risk.Decision || 'REVIEW';
	const pd = risk.pd != null ? `${(risk.pd * 100).toFixed(2)}%` : '—';
	const drivers = risk.drivers || risk.risk_drivers || [];

	sections.push(
		new Paragraph({ text: '4. Risk Assessment', heading: HeadingLevel.HEADING_1 }),
		new Table({
			rows: [
				new TableRow({ children: [headerCell('Parameter'), headerCell('Value')] }),
				kvRow('Risk Score', `${riskScore} / 100`),
				kvRow('Risk Grade', riskGrade),
				kvRow('Decision', riskDecision),
				kvRow('Probability of Default', pd),
				kvRow('Recommended Limit', risk.recommendedLimit ? `₹${(risk.recommendedLimit / 10000000).toFixed(2)} Cr` : '—'),
				kvRow('Suggested Interest Rate', str(risk.suggestedInterestRate)),
			],
			width: { size: 100, type: WidthType.PERCENTAGE },
		}),
		new Paragraph({ spacing: { after: 200 } }),
	);

	if (drivers.length > 0) {
		sections.push(
			new Paragraph({ text: 'Key Risk Drivers', heading: HeadingLevel.HEADING_2 }),
			...drivers.map(d => new Paragraph({
				children: [new TextRun({ text: `• ${d.factor || d.name || d}: `, bold: true, size: 20, font: 'Calibri' }), new TextRun({ text: `Impact: ${d.impact || d.weight || ''}`, size: 20, font: 'Calibri' })],
				spacing: { after: 80 },
			})),
			new Paragraph({ spacing: { after: 300 } }),
		);
	}

	// ── SECTION 5: SWOT Analysis ─────────────────────────
	const swotSections = [
		{ label: 'Strengths', data: swot.strengths || [] },
		{ label: 'Weaknesses', data: swot.weaknesses || [] },
		{ label: 'Opportunities', data: swot.opportunities || [] },
		{ label: 'Threats', data: swot.threats || [] },
	];

	sections.push(
		new Paragraph({ text: '5. SWOT Analysis', heading: HeadingLevel.HEADING_1 }),
	);

	for (const s of swotSections) {
		sections.push(
			new Paragraph({ text: s.label, heading: HeadingLevel.HEADING_2 }),
			...(s.data.length > 0
				? s.data.map(item => new Paragraph({
					children: [new TextRun({ text: `• ${item.point || item}`, size: 20, font: 'Calibri' })],
					spacing: { after: 60 },
				}))
				: [new Paragraph({ children: [new TextRun({ text: 'No data available', size: 20, italics: true, color: '999999', font: 'Calibri' })] })]
			),
		);
	}
	sections.push(new Paragraph({ spacing: { after: 300 } }));

	// ── SECTION 6: Triangulation Results ─────────────────
	const contradictions = tri.contradictions || [];
	const confirmations = tri.confirmations || [];

	sections.push(
		new Paragraph({ text: '6. Triangulation Results', heading: HeadingLevel.HEADING_1 }),
		new Paragraph({
			children: [new TextRun({ text: `Overall Consistency Score: ${tri.overall_triangulation_score ?? 'N/A'} / 100`, bold: true, size: 22, font: 'Calibri' })],
			spacing: { after: 200 },
		}),
	);

	if (contradictions.length > 0) {
		sections.push(
			new Paragraph({ text: 'Contradictions / Flags', heading: HeadingLevel.HEADING_2 }),
			...contradictions.map(c => new Paragraph({
				children: [
					new TextRun({ text: `⚠ [${(c.severity || 'MEDIUM').toUpperCase()}] `, bold: true, size: 20, color: 'CC0000', font: 'Calibri' }),
					new TextRun({ text: `${c.check}: ${c.flag}`, size: 20, font: 'Calibri' }),
				],
				spacing: { after: 80 },
			})),
		);
	}

	if (confirmations.length > 0) {
		sections.push(
			new Paragraph({ text: 'Confirmations', heading: HeadingLevel.HEADING_2 }),
			...confirmations.map(c => new Paragraph({
				children: [
					new TextRun({ text: '✓ ', bold: true, size: 20, color: '008800', font: 'Calibri' }),
					new TextRun({ text: `${c.check}: ${c.message}`, size: 20, font: 'Calibri' }),
				],
				spacing: { after: 80 },
			})),
		);
	}

	if (contradictions.length === 0 && confirmations.length === 0) {
		sections.push(new Paragraph({ children: [new TextRun({ text: 'No triangulation data available.', size: 20, italics: true, font: 'Calibri' })] }));
	}
	sections.push(new Paragraph({ spacing: { after: 300 } }));

	// ── SECTION 7: Key Covenants ─────────────────────────
	sections.push(
		new Paragraph({ text: '7. Key Covenants & Conditions', heading: HeadingLevel.HEADING_1 }),
	);
	if (covenants.length > 0) {
		covenants.forEach((c, i) => {
			sections.push(new Paragraph({
				children: [new TextRun({ text: `${i + 1}. ${c}`, size: 20, font: 'Calibri' })],
				spacing: { after: 60 },
			}));
		});
	} else {
		sections.push(new Paragraph({ children: [new TextRun({ text: 'Standard covenants apply as per bank policy.', size: 20, italics: true, font: 'Calibri' })] }));
	}
	sections.push(new Paragraph({ spacing: { after: 300 } }));

	// ── SECTION 8: Reasoning Breakdown ───────────────────
	sections.push(
		new Paragraph({ text: '8. Reasoning Breakdown', heading: HeadingLevel.HEADING_1 }),
	);
	if (Array.isArray(reasoning) && reasoning.length > 0) {
		reasoning.forEach(r => {
			sections.push(
				new Paragraph({
					children: [new TextRun({ text: r.category || r.factor || 'Analysis', bold: true, size: 22, font: 'Calibri' })],
					spacing: { after: 60 },
				}),
				new Paragraph({
					children: [new TextRun({ text: r.reasoning || r.explanation || r.text || JSON.stringify(r), size: 20, font: 'Calibri' })],
					spacing: { after: 150 },
				}),
			);
		});
	} else {
		const camSummary = analysis.camSummary || {};
		const fiveCs = camSummary.fiveCs || {};
		if (Object.keys(fiveCs).length > 0) {
			sections.push(new Paragraph({ text: 'Five Cs Assessment', heading: HeadingLevel.HEADING_2 }));
			Object.entries(fiveCs).forEach(([key, val]) => {
				sections.push(new Paragraph({
					children: [
						new TextRun({ text: `${key.charAt(0).toUpperCase() + key.slice(1)}: `, bold: true, size: 20, font: 'Calibri' }),
						new TextRun({ text: String(val), size: 20, font: 'Calibri' }),
					],
					spacing: { after: 80 },
				}));
			});
			if (camSummary.recommendation) {
				sections.push(new Paragraph({
					children: [
						new TextRun({ text: 'Recommendation: ', bold: true, size: 22, font: 'Calibri' }),
						new TextRun({ text: String(camSummary.recommendation), size: 22, bold: true, color: '1F4E79', font: 'Calibri' }),
					],
					spacing: { before: 200, after: 200 },
				}));
			}
		} else {
			sections.push(new Paragraph({ children: [new TextRun({ text: 'Detailed reasoning not available for this analysis.', size: 20, italics: true, font: 'Calibri' })] }));
		}
	}
	sections.push(new Paragraph({ spacing: { after: 400 } }));

	// ── FOOTER / DISCLAIMER ──────────────────────────────
	sections.push(
		new Paragraph({
			children: [new TextRun({ text: '─'.repeat(60), size: 16, color: 'CCCCCC', font: 'Calibri' })],
		}),
		new Paragraph({
			children: [new TextRun({
				text: 'DISCLAIMER: This Credit Appraisal Memorandum has been generated by the Intelli-Credit AI platform. '
					+ 'All data and assessments are derived from uploaded documents, publicly available information, and AI-based analysis. '
					+ 'Final credit decisions should be made by authorized personnel after independent verification.',
				size: 16, italics: true, color: '888888', font: 'Calibri',
			})],
			spacing: { after: 100 },
		}),
		new Paragraph({
			children: [new TextRun({ text: `Report generated on ${dateStr} | Intelli-Credit Analysis Platform`, size: 16, color: '888888', font: 'Calibri' })],
			alignment: AlignmentType.CENTER,
		}),
	);

	const doc = new Document({
		creator: 'Intelli-Credit',
		title: `Credit Appraisal Memo - ${companyName}`,
		description: `CAM Report for ${companyName}`,
		sections: [{
			children: sections,
			footers: {
				default: new Footer({
					children: [new Paragraph({
						children: [new TextRun({ text: `Intelli-Credit | ${companyName} | Confidential`, size: 14, color: 'AAAAAA', font: 'Calibri' })],
						alignment: AlignmentType.CENTER,
					})],
				}),
			},
		}],
	});
	return doc;
}

// ═══════════════════════════════════════════════════════════
//  HELPER: Build XLSX locally using ExcelJS
// ═══════════════════════════════════════════════════════════
async function buildXlsxLocally(analysis) {
	const ent = analysis.entityDetails || {};
	const loan = analysis.loanDetails || {};
	const fin = analysis.extractedData?.financials || analysis.extractedData || {};
	const ratios = analysis.extractedData?.ratios || {};
	const risk = analysis.riskDetails || {};
	const swot = analysis.swotAnalysis?.swot || analysis.swotAnalysis || {};
	const tri = analysis.triangulationResults || {};
	const companyName = ent.companyName || analysis.companyId?.name || 'Company';

	const workbook = new ExcelJS.Workbook();
	workbook.creator = 'Intelli-Credit';
	workbook.created = new Date();

	const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
	const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
	const altRowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F7FC' } };
	const borderStyle = { style: 'thin', color: { argb: 'FFCCCCCC' } };
	const allBorders = { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle };

	const styleHeaders = (sheet, cols) => {
		const row = sheet.getRow(1);
		row.font = headerFont;
		row.fill = headerFill;
		row.alignment = { horizontal: 'center', vertical: 'middle' };
		row.height = 22;
		cols.forEach((_, i) => { row.getCell(i + 1).border = allBorders; });
	};

	const styleDataRows = (sheet, startRow, endRow, colCount) => {
		for (let r = startRow; r <= endRow; r++) {
			const row = sheet.getRow(r);
			if (r % 2 === 0) row.fill = altRowFill;
			for (let c = 1; c <= colCount; c++) {
				row.getCell(c).border = allBorders;
				row.getCell(c).font = { name: 'Calibri', size: 10 };
			}
		}
	};

	// ── Sheet 1: Financial Summary ──────────────────────
	const ws1 = workbook.addWorksheet('Financial Summary');
	ws1.columns = [
		{ header: 'Metric', key: 'metric', width: 28 },
		{ header: 'Value', key: 'value', width: 25 },
	];

	const fmtCr = (v) => v != null ? `₹${(v / 10000000).toFixed(2)} Cr` : '—';
	const financialRows = [
		{ metric: 'Company Name', value: companyName },
		{ metric: 'Sector', value: ent.sector || '—' },
		{ metric: 'Revenue', value: fmtCr(fin.revenue) },
		{ metric: 'Net Profit (PAT)', value: fmtCr(fin.pat || fin.netProfit) },
		{ metric: 'EBITDA', value: fmtCr(fin.ebitda) },
		{ metric: 'Net Worth', value: fmtCr(fin.netWorth) },
		{ metric: 'Total Debt', value: fmtCr(fin.totalDebt) },
		{ metric: 'Total Assets', value: fmtCr(fin.totalAssets) },
		{ metric: 'Total Liabilities', value: fmtCr(fin.totalLiabilities) },
		{ metric: 'Interest Expense', value: fmtCr(fin.interestExpense) },
		{ metric: '', value: '' },
		{ metric: 'FINANCIAL RATIOS', value: '' },
		{ metric: 'Debt / Equity', value: ratios.debtEquity != null ? `${ratios.debtEquity}x` : '—' },
		{ metric: 'Current Ratio', value: ratios.currentRatio != null ? `${ratios.currentRatio}x` : '—' },
		{ metric: 'DSCR', value: ratios.dscr != null ? `${ratios.dscr}x` : '—' },
		{ metric: 'Interest Coverage', value: ratios.interestCoverage != null ? `${ratios.interestCoverage}x` : '—' },
		{ metric: 'Return on Equity', value: ratios.returnOnEquity != null ? `${ratios.returnOnEquity}%` : '—' },
		{ metric: 'Net Profit Margin', value: ratios.netProfitMargin != null ? `${ratios.netProfitMargin}%` : '—' },
		{ metric: 'Gross Margin', value: ratios.grossMargin != null ? `${ratios.grossMargin}%` : '—' },
	];
	financialRows.forEach(r => ws1.addRow(r));
	styleHeaders(ws1, [1, 2]);
	styleDataRows(ws1, 2, ws1.rowCount, 2);
	// Bold the sub-header
	const subHdrRow = ws1.getRow(financialRows.findIndex(r => r.metric === 'FINANCIAL RATIOS') + 2);
	if (subHdrRow) { subHdrRow.font = { bold: true, size: 11, name: 'Calibri', color: { argb: 'FF1F4E79' } }; }

	// ── Sheet 2: Risk Analysis ──────────────────────────
	const ws2 = workbook.addWorksheet('Risk Analysis');
	ws2.columns = [
		{ header: 'Parameter', key: 'param', width: 28 },
		{ header: 'Value', key: 'value', width: 30 },
	];
	const drivers = risk.drivers || risk.risk_drivers || [];
	const riskRows = [
		{ param: 'Risk Score', value: `${risk.score || analysis.riskScore || 0} / 100` },
		{ param: 'Risk Grade', value: risk.grade || risk.Grade || 'Not Graded' },
		{ param: 'Decision', value: risk.decision || risk.Decision || 'REVIEW' },
		{ param: 'Probability of Default', value: risk.pd != null ? `${(risk.pd * 100).toFixed(2)}%` : '—' },
		{ param: 'Recommended Limit', value: risk.recommendedLimit ? `₹${(risk.recommendedLimit / 10000000).toFixed(2)} Cr` : '—' },
		{ param: 'Suggested Interest Rate', value: risk.suggestedInterestRate || '—' },
		{ param: '', value: '' },
		{ param: 'RISK DRIVERS', value: '' },
	];
	drivers.forEach(d => {
		riskRows.push({ param: d.factor || d.name || String(d), value: `Impact: ${d.impact || d.weight || '—'}` });
	});
	if (drivers.length === 0) riskRows.push({ param: 'No drivers available', value: '—' });
	riskRows.forEach(r => ws2.addRow(r));
	styleHeaders(ws2, [1, 2]);
	styleDataRows(ws2, 2, ws2.rowCount, 2);

	// ── Sheet 3: SWOT Analysis ──────────────────────────
	const ws3 = workbook.addWorksheet('SWOT Analysis');
	ws3.columns = [
		{ header: 'Category', key: 'category', width: 18 },
		{ header: 'Point', key: 'point', width: 50 },
		{ header: 'Data Reference', key: 'ref', width: 30 },
	];
	const swotCategories = [
		{ cat: 'Strengths', data: swot.strengths || [] },
		{ cat: 'Weaknesses', data: swot.weaknesses || [] },
		{ cat: 'Opportunities', data: swot.opportunities || [] },
		{ cat: 'Threats', data: swot.threats || [] },
	];
	for (const s of swotCategories) {
		if (s.data.length > 0) {
			s.data.forEach(item => {
				ws3.addRow({ category: s.cat, point: item.point || String(item), ref: item.data_ref || '—' });
			});
		} else {
			ws3.addRow({ category: s.cat, point: 'No data available', ref: '—' });
		}
	}
	styleHeaders(ws3, [1, 2, 3]);
	styleDataRows(ws3, 2, ws3.rowCount, 3);

	// ── Sheet 4: Triangulation ──────────────────────────
	const ws4 = workbook.addWorksheet('Triangulation');
	ws4.columns = [
		{ header: 'Type', key: 'type', width: 18 },
		{ header: 'Check / Source', key: 'check', width: 35 },
		{ header: 'Finding', key: 'finding', width: 45 },
		{ header: 'Severity / Status', key: 'severity', width: 18 },
	];
	ws4.addRow({ type: 'Score', check: 'Overall Consistency', finding: `${tri.overall_triangulation_score ?? 'N/A'} / 100`, severity: '—' });
	(tri.contradictions || []).forEach(c => {
		ws4.addRow({ type: 'Contradiction', check: c.check || '—', finding: c.flag || '—', severity: (c.severity || 'MEDIUM').toUpperCase() });
	});
	(tri.confirmations || []).forEach(c => {
		ws4.addRow({ type: 'Confirmation', check: c.check || '—', finding: c.message || '—', severity: 'OK' });
	});
	if ((tri.contradictions || []).length === 0 && (tri.confirmations || []).length === 0) {
		ws4.addRow({ type: '—', check: 'No triangulation data', finding: 'Run analysis first', severity: '—' });
	}
	styleHeaders(ws4, [1, 2, 3, 4]);
	styleDataRows(ws4, 2, ws4.rowCount, 4);

	return workbook;
}

// ═══════════════════════════════════════════════════════════
//  ENDPOINTS
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/v1/report/:analysisId
 */
exports.getReport = async (req, res, next) => {
	try {
		const analysis = await findAnalysis(req.params.analysisId, true);
		if (!analysis) {
			return res.status(404).json({ error: { code: 'ANALYSIS_NOT_FOUND', message: 'Analysis not found' } });
		}
		if (analysis.status !== 'complete') {
			return res.status(409).json({
				error: { code: 'ANALYSIS_INCOMPLETE', message: `Analysis is still ${analysis.status}. Wait for completion.` }
			});
		}
		res.json({
			analysisId: analysis.analysisId || analysis._id,
			companyName: analysis.companyId?.name || analysis.entityDetails?.companyName || 'Unknown',
			camUrl: analysis.camUrl || '/static/sample-cam.pdf',
			summary: analysis.camSummary || {
				fiveCs: { character: 'Stable', capacity: 'Adequate', capital: 'Moderate', collateral: 'Partial', conditions: 'Watchlist' },
				recommendation: 'PROVISIONAL',
			},
			riskScore: analysis.riskScore,
			riskDetails: analysis.riskDetails,
			extractedData: analysis.extractedData,
			researchFindings: analysis.researchFindings,
			triangulationResults: analysis.triangulationResults,
			swotAnalysis: analysis.swotAnalysis,
			reasoningBreakdown: analysis.reasoningBreakdown,
			entityDetails: analysis.entityDetails,
			loanDetails: analysis.loanDetails,
		});
	} catch (error) { next(error); }
};

/**
 * POST /api/v1/report/generate  —  Generate & Download DOCX
 */
exports.generateReport = async (req, res, next) => {
	try {
		const { analysisId } = req.body;
		if (!analysisId) return res.status(400).json({ error: { message: 'analysisId is required' } });

		const analysis = await findAnalysis(analysisId, true);
		if (!analysis) return res.status(400).json({ error: { message: 'Analysis not found.' } });

		// 1) Try external CAM service first
		try {
			const qualitative = await QualitativeAssessment.findOne({ companyId: analysis.companyId?._id }).sort({ createdAt: -1 }) || {};
			const payload = {
				companyData: analysis.companyId ? analysis.companyId.toObject() : { name: analysis.entityDetails?.companyName || 'Company' },
				extractedData: analysis.extractedData,
				researchFindings: analysis.researchFindings || {},
				qualitativeAssessment: {
					siteVisitRating: qualitative.siteVisitRating || 3,
					managementQualityRating: qualitative.managementQualityRating || 3,
					notes: qualitative.notes || ''
				},
				riskAnalysis: analysis.riskDetails,
			};
			const camResult = await callCAM(payload, req.id);
			analysis.camUrl = camResult.docxUrl || camResult.pdfUrl || camResult.downloadUrl || '/static/sample-cam.pdf';
			await analysis.save();
			return res.status(200).json({ analysisId, camUrl: analysis.camUrl, downloadUrl: analysis.camUrl, filename: camResult.filename });
		} catch {
			// External service unavailable — generate locally
		}

		// 2) Generate DOCX locally
		const doc = buildDocxLocally(analysis);
		const buffer = await Packer.toBuffer(doc);
		const safeName = (analysis.entityDetails?.companyName || 'Company').replace(/[^a-zA-Z0-9_-]/g, '_');
		const filename = `CAM_${safeName}_${Date.now()}.docx`;
		const filePath = path.join(REPORTS_DIR, filename);
		fs.writeFileSync(filePath, buffer);

		const downloadUrl = `/static/reports/${filename}`;
		analysis.camUrl = downloadUrl;
		await analysis.save();

		return res.status(200).json({ analysisId, camUrl: downloadUrl, downloadUrl, filename });
	} catch (error) { next(error); }
};

/**
 * GET /api/v1/report/swot/:analysisId
 */
exports.getSwot = async (req, res, next) => {
	try {
		const { analysisId } = req.params;
		const analysis = await findAnalysis(analysisId, false);

		if (analysis && analysis.swotAnalysis) {
			return res.json(analysis.swotAnalysis);
		}

		// Try AI service
		if (analysis) {
			try {
				const swotResult = await callSwot({
					company_name: analysis.entityDetails?.companyName || 'Company',
					sector: analysis.entityDetails?.sector || '',
					extracted_financials: analysis.extractedData || {},
					research_findings: analysis.researchFindings || {},
					risk_scores: analysis.riskDetails || {},
					loan_details: analysis.loanDetails || {},
				}, req.headers['x-analysis-id'] || analysisId);
				await Analysis.findByIdAndUpdate(analysis._id, { swotAnalysis: swotResult });
				return res.json(swotResult);
			} catch { /* fall through to stub */ }
		}

		// Graceful stub
		return res.json({
			status: 'stub',
			swot: {
				strengths: [{ point: 'Established entity with operational track record', data_ref: 'Entity verified' }],
				weaknesses: [{ point: 'Financial data pending full extraction', data_ref: 'Extraction in progress' }],
				opportunities: [{ point: 'Sector growth aligned with loan purpose', data_ref: 'Sector research' }],
				threats: [{ point: 'Regulatory changes may impact credit norms', data_ref: 'RBI guidelines 2025' }],
			},
			company: analysis?.entityDetails?.companyName || 'Company',
			source: 'heuristic',
		});
	} catch (error) { next(error); }
};

/**
 * GET /api/v1/report/xlsx/:analysisId  —  Download XLSX
 */
exports.downloadXlsx = async (req, res, next) => {
	try {
		const { analysisId } = req.params;
		const analysis = await findAnalysis(analysisId, false);

		// 1) Try external service first
		try {
			const xlsxResponse = await callGenerateXlsx({
				company_name: analysis?.entityDetails?.companyName || 'Company',
				analysis_id: analysisId,
				documents: analysis?.documents || [],
				risk_scores: analysis?.riskDetails || {},
				swot: analysis?.swotAnalysis?.swot || {},
			}, analysisId);
			res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
			res.setHeader('Content-Disposition', `attachment; filename="IntelliCredit_Report_${analysisId}.xlsx"`);
			return res.send(Buffer.from(xlsxResponse.data));
		} catch {
			// External service unavailable — generate locally
		}

		// 2) Generate XLSX locally
		try {
			const workbook = await buildXlsxLocally(analysis || { entityDetails: {}, extractedData: {}, riskDetails: {}, swotAnalysis: {}, triangulationResults: {} });
			const buffer = await workbook.xlsx.writeBuffer();
			res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
			const safeName = (analysis?.entityDetails?.companyName || 'Company').replace(/[^a-zA-Z0-9_-]/g, '_');
			res.setHeader('Content-Disposition', `attachment; filename="IntelliCredit_${safeName}_Data.xlsx"`);
			return res.send(Buffer.from(buffer));
		} catch (xlsxErr) {
			// 3) CSV fallback — last resort
			const csv = [
				'Entity,Risk Score,Grade,Decision',
				`${analysis?.entityDetails?.companyName || 'Company'},${analysis?.riskScore || 'N/A'},${analysis?.riskDetails?.grade || 'N/A'},${analysis?.riskDetails?.decision || 'N/A'}`,
			].join('\n');
			res.setHeader('Content-Type', 'text/csv');
			res.setHeader('Content-Disposition', `attachment; filename="IntelliCredit_Summary_${analysisId}.csv"`);
			return res.send(csv);
		}
	} catch (error) { next(error); }
};

/**
 * GET /api/v1/report/triangulation-pdf/:analysisId  —  Download Triangulation Report
 */
exports.downloadTriangulationPdf = async (req, res, next) => {
	try {
		const { analysisId } = req.params;
		const analysis = await findAnalysis(analysisId, false);

		const companyName = analysis?.entityDetails?.companyName || 'N/A';
		const sector = analysis?.entityDetails?.sector || 'N/A';
		const tri = analysis?.triangulationResults || {
			contradictions: [],
			confirmations: [{ check: 'No data', message: 'Run analysis first to populate triangulation results' }],
			overall_triangulation_score: null,
		};
		const dateStr = new Date().toISOString().split('T')[0];

		const separator = '═'.repeat(60);
		const thinSep = '─'.repeat(60);

		const lines = [
			separator,
			'  INTELLI-CREDIT — TRIANGULATION ANALYSIS REPORT',
			separator,
			'',
			`  Company:       ${companyName}`,
			`  Sector:        ${sector}`,
			`  Analysis ID:   ${analysisId}`,
			`  Generated:     ${dateStr}`,
			`  Platform:      Intelli-Credit AI`,
			'',
			thinSep,
			'  METHODOLOGY',
			thinSep,
			'  This report compares data extracted from uploaded financial',
			'  documents against AI-estimated benchmarks and publicly',
			'  available market data to identify discrepancies, confirm',
			'  consistency, and flag potential risks.',
			'',
			thinSep,
			`  OVERALL CONSISTENCY SCORE: ${tri.overall_triangulation_score ?? 'N/A'} / 100`,
			thinSep,
			'',
		];

		// Contradictions
		lines.push(thinSep, '  CONTRADICTIONS / FLAGS', thinSep);
		if ((tri.contradictions || []).length > 0) {
			tri.contradictions.forEach((c, i) => {
				lines.push(`  ${i + 1}. [${(c.severity || 'MEDIUM').toUpperCase()}] ${c.check}`);
				lines.push(`     → ${c.flag}`);
				lines.push('');
			});
		} else {
			lines.push('  None identified — all data points consistent.', '');
		}

		// Confirmations
		lines.push(thinSep, '  CONFIRMATIONS', thinSep);
		if ((tri.confirmations || []).length > 0) {
			tri.confirmations.forEach((c, i) => {
				lines.push(`  ${i + 1}. [OK] ${c.check}`);
				lines.push(`     → ${c.message}`);
				lines.push('');
			});
		} else {
			lines.push('  None identified.', '');
		}

		// Cross-verification
		const cv = analysis?.extractedData?.crossVerification;
		if (cv) {
			lines.push(thinSep, '  CROSS-VERIFICATION (GST vs BANK)', thinSep);
			lines.push(`  GST Turnover:    ₹${cv.gstTurnover ? (cv.gstTurnover / 10000000).toFixed(2) + ' Cr' : 'N/A'}`);
			lines.push(`  Bank Turnover:   ₹${cv.bankTurnover ? (cv.bankTurnover / 10000000).toFixed(2) + ' Cr' : 'N/A'}`);
			lines.push(`  Variance:        ${cv.variancePercent != null ? cv.variancePercent.toFixed(1) + '%' : 'N/A'}`);
			lines.push(`  Revenue Flag:    ${cv.revenueInflationFlag ? '⚠ YES — Revenue Inflation Suspected' : '✓ No flag'}`);
			if (cv.analysis) lines.push(`  Analysis:        ${cv.analysis}`);
			lines.push('');
		}

		lines.push(
			separator,
			'  DISCLAIMER',
			separator,
			'  This triangulation report is auto-generated by the',
			'  Intelli-Credit platform. Results should be verified',
			'  by authorized credit analysts before final decisions.',
			'',
			`  Report generated on ${dateStr}`,
			separator,
		);

		res.setHeader('Content-Type', 'text/plain; charset=utf-8');
		res.setHeader('Content-Disposition', `attachment; filename="Triangulation_Report_${analysisId}.txt"`);
		return res.send(lines.join('\n'));
	} catch (error) { next(error); }
};
