const Company = require('../models/Company');
const Financial = require('../models/Financial');
const { callExtraction } = require('../services/aiClient');
const { logger } = require('../utils/logger');

/**
 * POST /api/v1/upload
 * Upload a document, extract data, save company + financials.
 * Phase 2: Real extraction with ratios, flags, cross-verification.
 */
exports.uploadDocument = async (req, res, next) => {
	try {
		if (!req.files || req.files.length === 0) {
			return res.status(400).json({
				error: { code: 'NO_FILE', message: 'No files uploaded' }
			});
		}

		// ── Input Sanitization ─────────────────────────────
		const ALLOWED_EXTS = ['.pdf', '.xlsx', '.xls', '.csv'];
		const MAX_SIZE = 25 * 1024 * 1024; // 25MB

		for (const file of req.files) {
			const ext = require('path').extname(file.originalname).toLowerCase();
			if (!ALLOWED_EXTS.includes(ext)) {
				return res.status(400).json({
					error: { code: 'INVALID_TYPE', message: `File type ${ext} not allowed. Accepted: ${ALLOWED_EXTS.join(', ')}` }
				});
			}
			if (file.size > MAX_SIZE) {
				return res.status(400).json({
					error: { code: 'FILE_TOO_LARGE', message: `File ${file.originalname} exceeds 25MB limit` }
				});
			}
			// Virus scan stub
			if (file.size > 10 * 1024 * 1024) {
				logger.warn(`[${req.id}] VIRUS_SCAN_STUB: Large file ${file.originalname} (${(file.size / 1024 / 1024).toFixed(1)}MB) — manual review recommended`);
			}
		}

		const { companyName, sector, gstin, pan, address } = req.body;

		// 1. Save company
		const company = new Company({
			name: companyName || 'Unknown Company',
			sector: sector || 'General',
			gstin: gstin || '',
			pan: pan || '',
			address: address || '',
		});
		await company.save();

		// 2. Extract data from the uploaded file (REAL extraction in Phase 2)
		let extractedData = {};
		try {
			extractedData = await callExtraction(req.files, req.id);
			logger.info(`[${req.id}] Extraction successful: ${JSON.stringify(extractedData.fileInfo || {})}`);
		} catch (err) {
			logger.warn(`[${req.id}] Extraction service unavailable, using stub data: ${err.message}`);
			extractedData = _stubExtractedData();
		}

		// 3. Save Financials (Phase 2 enhanced)
		const fin = extractedData.financials || {};
		const financial = new Financial({
			companyId: company._id,
			period: 'FY2024',
			// Core financials
			revenue: fin.revenue || extractedData.revenue || 0,
			pat: fin.pat || extractedData.netProfit || 0,
			ebitda: fin.ebitda || 0,
			netWorth: fin.netWorth || 0,
			totalDebt: fin.totalDebt || 0,
			totalAssets: fin.totalAssets || extractedData.balanceSheet?.totalAssets || 0,
			totalLiabilities: fin.totalLiabilities || extractedData.balanceSheet?.totalLiabilities || 0,
			currentAssets: fin.currentAssets || 0,
			currentLiabilities: fin.currentLiabilities || 0,
			interestExpense: fin.interestExpense || 0,
			depreciation: fin.depreciation || 0,
			// Legacy compat
			netProfit: fin.pat || extractedData.netProfit || 0,
			liabilities: fin.totalLiabilities || extractedData.liabilities || 0,
			gstTurnover: extractedData.gstTurnover || extractedData.gstAnalysis?.gstTurnover || 0,
			bankTurnover: extractedData.bankTurnover || extractedData.bankAnalysis?.bankTurnover || 0,
			// Phase 2 fields
			ratios: extractedData.ratios || {},
			cibilScore: fin.cibilScore || null,
			cibilBand: fin.cibilBand || null,
			gstAnalysis: extractedData.gstAnalysis || {},
			bankAnalysis: extractedData.bankAnalysis || {},
			crossVerification: extractedData.crossVerification || {},
			redFlags: extractedData.redFlags || [],
		});
		await financial.save();

		res.status(200).json({
			fileId: req.files[0].filename,
			filename: req.files.map(f => f.originalname).join(', '),
			companyId: company._id,
			extractedData,
			status: 'received',
		});
	} catch (error) {
		next(error);
	}
};

/**
 * GET /api/v1/upload/:id
 * Return file metadata by fileId.
 */
exports.getUploadById = async (req, res, next) => {
	try {
		const { id } = req.params;
		const fs = require('fs');
		const path = require('path');
		const uploadDir = path.join(__dirname, '../../uploads');

		if (!fs.existsSync(uploadDir)) {
			return res.status(404).json({
				error: { code: 'FILE_NOT_FOUND', message: 'Upload directory not found' }
			});
		}

		const files = fs.readdirSync(uploadDir);
		const match = files.find(f => f === id || f.includes(id));

		if (!match) {
			return res.status(404).json({
				error: { code: 'FILE_NOT_FOUND', message: 'Upload not found' }
			});
		}

		const stats = fs.statSync(path.join(uploadDir, match));
		res.json({
			fileId: match,
			size: stats.size,
			uploadedAt: stats.mtime.toISOString(),
			status: 'stored',
		});
	} catch (error) {
		next(error);
	}
};

/**
 * Stub data fallback when extraction service is unreachable.
 */
function _stubExtractedData() {
	return {
		financials: {
			revenue: 150000000,
			pat: 18000000,
			ebitda: 28000000,
			netWorth: 40000000,
			totalDebt: 80000000,
			totalAssets: 120000000,
			totalLiabilities: 80000000,
			currentAssets: 45000000,
			currentLiabilities: 30000000,
			interestExpense: 12000000,
			depreciation: 8000000,
		},
		ratios: {
			debtEquity: 2.0,
			currentRatio: 1.5,
			dscr: 2.33,
			interestCoverage: 2.33,
			debtToAssets: 0.67,
			returnOnEquity: 45.0,
			netProfitMargin: 12.0,
		},
		gstAnalysis: {
			gstTurnover: 165000000,
			itcMismatchPercent: null,
			circularTradingRisk: false,
		},
		bankAnalysis: {
			bankTurnover: 140000000,
			totalCredits: 140000000,
			totalDebits: 125000000,
		},
		crossVerification: {
			variancePercent: 15.15,
			revenueInflationFlag: true,
			analysis: 'Stub data — cross-verify with real documents',
		},
		redFlags: [],
		balanceSheet: { totalAssets: 120000000, totalLiabilities: 80000000, netWorth: 40000000 },
		keyCovenants: ['Maintain DSCR > 1.2', 'Current ratio > 1.5'],
		revenue: 150000000,
		netProfit: 18000000,
		liabilities: 80000000,
		gstTurnover: 165000000,
		bankTurnover: 140000000,
	};
}
