"""
Extraction Service — Multi-Format Financial Parser (Phase 2)
Accepts PDF (annual reports OR bank statements), GST CSV, and Bank Statement CSV.
Returns structured financial metrics with ratios, flags, and cross-verification.

v2.0: Added /classify endpoint (Gemini/heuristic) and schema-aware /extract.
"""

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import uvicorn
import logging
import os
import io
import re
import json

from extractors.pdf_extractor import extract_financials, extract_text_from_pdf
from extractors.financial_parser import parse_gst_csv, compute_itc_mismatch
from extractors.bank_parser import parse_bank_statement, parse_bank_pdf
from extractors.ratio_calculator import compute_ratios
from extractors.red_flag_detector import detect_red_flags
from extractors.cross_verifier import cross_verify

try:
    from ai_provider import call_ai_json, GEMINI_KEY
except ImportError:
    GEMINI_KEY = ""
    def call_ai_json(prompt): return {}

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Extraction Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── PDF Type Detection ─────────────────────────────────────
BANK_STATEMENT_KEYWORDS = [
    "bank statement", "account statement", "statement of account",
    "transaction details", "opening balance", "closing balance",
    "debit", "credit", "withdrawal", "deposit",
    "cheque no", "chq no", "neft", "rtgs", "imps", "upi",
    "passbook", "current account", "savings account",
    "narration", "particulars", "value date",
]

ANNUAL_REPORT_KEYWORDS = [
    "annual report", "balance sheet", "profit and loss",
    "revenue from operations", "total income", "shareholders",
    "auditor", "director", "board of directors",
    "net worth", "reserves and surplus", "depreciation",
    "schedule", "notes to accounts", "cash flow",
    "ebitda", "earnings before", "profit after tax",
]


def detect_pdf_type(text: str) -> str:
    if not text:
        return "annual_report"
    text_lower = text[:5000].lower()
    bank_score = sum(1 for kw in BANK_STATEMENT_KEYWORDS if kw in text_lower)
    annual_score = sum(1 for kw in ANNUAL_REPORT_KEYWORDS if kw in text_lower)
    logger.info(f"PDF type detection — bank_score={bank_score}, annual_score={annual_score}")
    if bank_score > annual_score:
        return "bank_statement"
    elif annual_score > bank_score:
        return "annual_report"
    else:
        date_amount_pattern = r'\d{2}[/-]\d{2}[/-]\d{2,4}\s+.*\d[\d,]+\.\d{2}'
        if len(re.findall(date_amount_pattern, text[:3000])) >= 3:
            return "bank_statement"
        return "annual_report"


# ── Default schemas per document type ──────────────────────
DEFAULT_SCHEMAS = {
    "ALM": [
        {"name": "maturity_buckets", "type": "Array", "required": True, "desc": "Maturity bucket breakdown"},
        {"name": "asset_liability_gap", "type": "Number", "required": True, "desc": "Gap between assets and liabilities"},
        {"name": "liquidity_ratio", "type": "Percentage", "required": True, "desc": "Liquidity coverage ratio"},
        {"name": "nsfr", "type": "Percentage", "required": False, "desc": "Net Stable Funding Ratio"},
        {"name": "lcr", "type": "Percentage", "required": False, "desc": "Liquidity Coverage Ratio"},
        {"name": "concentration_risk", "type": "Number", "required": False, "desc": "Concentration risk metric"},
    ],
    "Shareholding Pattern": [
        {"name": "promoter_holding_pct", "type": "Percentage", "required": True, "desc": "Promoter shareholding %"},
        {"name": "public_holding_pct", "type": "Percentage", "required": True, "desc": "Public shareholding %"},
        {"name": "institutional_holding_pct", "type": "Percentage", "required": False, "desc": "Institutional holding %"},
        {"name": "total_shareholders", "type": "Number", "required": False, "desc": "Total number of shareholders"},
        {"name": "pledged_shares_pct", "type": "Percentage", "required": True, "desc": "Pledged shares as % of total"},
        {"name": "top10_shareholders", "type": "Array", "required": False, "desc": "Top 10 shareholders list"},
    ],
    "Borrowing Profile": [
        {"name": "total_borrowings", "type": "Number", "required": True, "desc": "Total borrowings"},
        {"name": "secured_loans", "type": "Number", "required": True, "desc": "Secured loans amount"},
        {"name": "unsecured_loans", "type": "Number", "required": True, "desc": "Unsecured loans amount"},
        {"name": "bank_wise_exposure", "type": "Array", "required": False, "desc": "Bank-wise exposure breakdown"},
        {"name": "weighted_avg_cost_of_funds", "type": "Percentage", "required": False, "desc": "Weighted avg cost"},
        {"name": "debt_maturity_profile", "type": "Array", "required": False, "desc": "Debt maturity profile"},
        {"name": "npa_ratio", "type": "Percentage", "required": True, "desc": "NPA ratio"},
    ],
    "Annual Report": [
        {"name": "revenue", "type": "Number", "required": True, "desc": "Revenue from operations"},
        {"name": "ebitda", "type": "Number", "required": True, "desc": "EBITDA"},
        {"name": "pat", "type": "Number", "required": True, "desc": "Profit After Tax"},
        {"name": "pat_margin_pct", "type": "Percentage", "required": False, "desc": "PAT margin %"},
        {"name": "total_assets", "type": "Number", "required": True, "desc": "Total assets"},
        {"name": "net_worth", "type": "Number", "required": True, "desc": "Net worth"},
        {"name": "debt_equity_ratio", "type": "Number", "required": True, "desc": "Debt to equity ratio"},
        {"name": "current_ratio", "type": "Number", "required": True, "desc": "Current ratio"},
        {"name": "interest_coverage_ratio", "type": "Number", "required": False, "desc": "Interest coverage ratio"},
        {"name": "dscr", "type": "Number", "required": True, "desc": "Debt Service Coverage Ratio"},
        {"name": "roe", "type": "Percentage", "required": False, "desc": "Return on Equity"},
        {"name": "roce", "type": "Percentage", "required": False, "desc": "Return on Capital Employed"},
        {"name": "cash_from_operations", "type": "Number", "required": False, "desc": "Cash flow from operations"},
    ],
    "Portfolio Data": [
        {"name": "total_portfolio_size", "type": "Number", "required": True, "desc": "Total portfolio size"},
        {"name": "stage1_pct", "type": "Percentage", "required": True, "desc": "Stage 1 assets %"},
        {"name": "stage2_pct", "type": "Percentage", "required": True, "desc": "Stage 2 assets %"},
        {"name": "stage3_pct", "type": "Percentage", "required": True, "desc": "Stage 3 assets %"},
        {"name": "gnpa_pct", "type": "Percentage", "required": True, "desc": "Gross NPA %"},
        {"name": "nnpa_pct", "type": "Percentage", "required": True, "desc": "Net NPA %"},
        {"name": "collection_efficiency", "type": "Percentage", "required": False, "desc": "Collection efficiency %"},
        {"name": "par30_pct", "type": "Percentage", "required": False, "desc": "PAR 30+ %"},
        {"name": "par90_pct", "type": "Percentage", "required": False, "desc": "PAR 90+ %"},
        {"name": "geographic_concentration", "type": "Array", "required": False, "desc": "Geographic concentration"},
    ],
}


def _heuristic_classify(filename: str, content_preview: str) -> dict:
    """Classify document using keyword heuristics when Gemini is unavailable."""
    text = (filename + " " + content_preview).lower()
    scores = {
        "ALM": sum(1 for kw in ["alm", "asset liability", "maturity", "liquidity", "nsfr", "lcr"] if kw in text),
        "Shareholding Pattern": sum(1 for kw in ["shareholding", "promoter", "holding pattern", "pledge", "shareholder"] if kw in text),
        "Borrowing Profile": sum(1 for kw in ["borrowing", "loan", "secured", "unsecured", "exposure", "debt"] if kw in text),
        "Annual Report": sum(1 for kw in ["annual report", "balance sheet", "profit", "loss", "revenue", "ebitda", "cash flow", "p&l"] if kw in text),
        "Portfolio Data": sum(1 for kw in ["portfolio", "npa", "stage", "gnpa", "collection", "par", "performance"] if kw in text),
    }
    best = max(scores, key=scores.get)
    best_score = scores[best]
    confidence = min(70, 30 + best_score * 15) if best_score > 0 else 20
    return {
        "predicted_type": best if best_score > 0 else "Unknown",
        "confidence": confidence,
        "reasoning": f"Heuristic classification: matched {best_score} keywords for {best}" if best_score > 0 else "No keywords matched",
        "suggested_schema": DEFAULT_SCHEMAS.get(best, []) if best_score > 0 else [],
    }


@app.get("/health")
def health_check():
    ocr_status = "available"
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
    except Exception:
        ocr_status = "unavailable"

    return {
        "status": "ok",
        "service": "extraction-service",
        "version": "2.0.0",
        "ocr": ocr_status,
        "ai_configured": bool(GEMINI_KEY),
    }


@app.post("/classify")
async def classify_document(
    file: UploadFile = File(...),
    analysis_id: str = Form(""),
):
    """Classify a document using Gemini or heuristic fallback."""
    content = await file.read()
    filename = file.filename or "unknown"
    file_ext = os.path.splitext(filename)[1].lower()

    # Get content preview
    content_preview = ""
    if file_ext == ".pdf":
        try:
            content_preview = extract_text_from_pdf(content)[:2000]
        except Exception:
            content_preview = ""
    elif file_ext in [".csv", ".xlsx", ".xls"]:
        try:
            content_preview = content[:2000].decode("utf-8", errors="replace")
        except Exception:
            content_preview = ""

    # Try Gemini classification first
    if GEMINI_KEY:
        prompt = f"""Classify this financial document. Based on the filename and content preview, determine the document type.

Filename: {filename}
File extension: {file_ext}
Content preview (first 2000 chars):
{content_preview[:2000]}

Return a JSON object with exactly these fields:
{{
  "predicted_type": one of ["ALM", "Shareholding Pattern", "Borrowing Profile", "Annual Report", "Portfolio Data", "Unknown"],
  "confidence": integer 0-100,
  "reasoning": "brief explanation"
}}"""
        result = call_ai_json(prompt)
        if result and "predicted_type" in result:
            doc_type = result["predicted_type"]
            result["suggested_schema"] = DEFAULT_SCHEMAS.get(doc_type, [])
            result["filename"] = filename
            return result

    # Fallback to heuristic
    result = _heuristic_classify(filename, content_preview)
    result["filename"] = filename
    return result


@app.post("/extract")
async def extract_data(file: UploadFile = File(...)):
    """
    Accept a single file upload.
    Detects file type (PDF annual report, PDF bank statement, CSV) and routes appropriately.
    """
    content = await file.read()
    filename = file.filename or "unknown"
    file_ext = os.path.splitext(filename)[1].lower()
    file_size = len(content)

    logger.info(f"Received file: {filename} ({file_size} bytes, type={file_ext})")

    # Initialize response components
    financials = {}
    gst_analysis = {}
    bank_data = {}
    red_flags = []
    raw_text_length = 0
    pdf_type = None

    if file_ext == ".pdf":
        text = extract_text_from_pdf(content)
        raw_text_length = len(text)
        pdf_type = detect_pdf_type(text)

        logger.info(f"PDF detected as: {pdf_type} (text length: {raw_text_length})")

        if pdf_type == "bank_statement":
            bank_data = parse_bank_pdf(content)
            logger.info(f"Bank PDF parsed: turnover={bank_data.get('bankTurnover')}, "
                        f"txns={bank_data.get('transactionCount')}")
            red_flags = detect_red_flags(text)
        else:
            financials = extract_financials(content)
            raw_text_length = financials.pop("rawExtractedTextLength", raw_text_length)
            financials.pop("metricsFound", None)
            financials.pop("extractionMethod", None)
            red_flags = detect_red_flags(text)

    elif file_ext == ".csv":
        fname_lower = filename.lower()
        if "gst" in fname_lower or "gstr" in fname_lower or "3b" in fname_lower or "2a" in fname_lower:
            gst_analysis = parse_gst_csv(content, filename)
        elif "bank" in fname_lower or "statement" in fname_lower:
            bank_data = parse_bank_statement(content, filename)
        else:
            gst_result = parse_gst_csv(content, filename)
            bank_result = parse_bank_statement(content, filename)
            if gst_result.get("gstTurnover") is not None:
                gst_analysis = gst_result
            elif bank_result.get("bankTurnover") is not None:
                bank_data = bank_result
            else:
                bank_data = bank_result
    else:
        return {
            "error": f"Unsupported file type: {file_ext}",
            "supportedTypes": [".pdf", ".csv", ".docx"],
        }

    # ── Compute Ratios ───────────────────────────────────
    ratios = compute_ratios(financials) if financials else {
        "debtEquity": None, "currentRatio": None, "dscr": None,
        "interestCoverage": None, "debtToAssets": None,
        "returnOnEquity": None, "netProfitMargin": None,
    }

    # ── Cross-Verification ───────────────────────────────
    gst_turnover = gst_analysis.get("gstTurnover")
    bank_turnover = bank_data.get("bankTurnover")
    books_revenue = financials.get("revenue")
    if not gst_turnover and books_revenue:
        gst_turnover = books_revenue
    cross_verification = cross_verify(gst_turnover, bank_turnover, books_revenue)

    # ── ITC Mismatch ─────────────────────────────────────
    itc_mismatch = {}
    if gst_analysis.get("itcClaimed") is not None or gst_analysis.get("itcAvailable") is not None:
        itc_mismatch = compute_itc_mismatch(
            gst_analysis.get("itcClaimed"),
            gst_analysis.get("itcAvailable"),
        )

    # ── Build Final Response ─────────────────────────────
    response = {
        "financials": {
            "revenue": financials.get("revenue"),
            "pat": financials.get("pat"),
            "ebitda": financials.get("ebitda"),
            "netWorth": financials.get("netWorth"),
            "totalDebt": financials.get("totalDebt"),
            "totalAssets": financials.get("totalAssets"),
            "totalLiabilities": financials.get("totalLiabilities"),
            "currentAssets": financials.get("currentAssets"),
            "currentLiabilities": financials.get("currentLiabilities"),
            "interestExpense": financials.get("interestExpense"),
            "depreciation": financials.get("depreciation"),
            "cibilScore": financials.get("cibilScore"),
            "cibilBand": financials.get("cibilBand"),
        },
        "ratios": ratios,
        "gstAnalysis": {
            "gstTurnover": gst_analysis.get("gstTurnover"),
            "itcClaimed": gst_analysis.get("itcClaimed"),
            "itcAvailable": gst_analysis.get("itcAvailable"),
            "itcMismatchPercent": itc_mismatch.get("mismatchPercent") if itc_mismatch else gst_analysis.get("itcMismatchPercent"),
            "circularTradingRisk": itc_mismatch.get("circularTradingRisk", False) if itc_mismatch else gst_analysis.get("circularTradingRisk", False),
            "monthlyData": gst_analysis.get("monthlyData", []),
            "fileType": gst_analysis.get("fileType", "N/A"),
        },
        "bankAnalysis": {
            "bankTurnover": bank_data.get("bankTurnover"),
            "totalCredits": bank_data.get("totalCredits"),
            "totalDebits": bank_data.get("totalDebits"),
            "transactionCount": bank_data.get("transactionCount", 0),
            "monthlyCredits": bank_data.get("monthlyCredits", []),
            "analysis": bank_data.get("analysis", ""),
        },
        "crossVerification": cross_verification,
        "redFlags": red_flags,
        "rawExtractedTextLength": raw_text_length,
        "pdfType": pdf_type,
        "fileInfo": {
            "filename": filename,
            "size": file_size,
            "type": file_ext,
            "detectedAs": pdf_type or file_ext,
            "processed": True,
        },
    }

    # ── Backward Compatibility (Phase 1 fields) ──────────
    response["balanceSheet"] = {
        "totalAssets": financials.get("totalAssets", 0) or 0,
        "totalLiabilities": financials.get("totalLiabilities", 0) or 0,
        "netWorth": financials.get("netWorth", 0) or 0,
        "currentAssets": financials.get("currentAssets", 0) or 0,
        "fixedAssets": (financials.get("totalAssets", 0) or 0) - (financials.get("currentAssets", 0) or 0),
        "currentLiabilities": financials.get("currentLiabilities", 0) or 0,
        "longTermDebt": financials.get("totalDebt", 0) or 0,
    }
    response["keyCovenants"] = []
    response["revenue"] = financials.get("revenue", 0) or 0
    response["netProfit"] = financials.get("pat", 0) or 0
    response["liabilities"] = financials.get("totalLiabilities", 0) or 0
    response["gstTurnover"] = gst_analysis.get("gstTurnover") or financials.get("revenue", 0) or 0
    response["bankTurnover"] = bank_data.get("bankTurnover", 0) or 0
    response["dscr"] = ratios.get("dscr")
    response["currentRatio"] = ratios.get("currentRatio")
    response["contingentLiabilities"] = 0

    return response


@app.post("/extract-multi")
async def extract_multi(
    pdf_file: Optional[UploadFile] = File(None),
    gst_file: Optional[UploadFile] = File(None),
    bank_file: Optional[UploadFile] = File(None),
):
    """Accept multiple files at once — PDF + GST CSV + Bank CSV."""
    financials = {}
    gst_analysis = {}
    bank_data = {}
    red_flags = []
    raw_text_length = 0

    if pdf_file and pdf_file.filename:
        content = await pdf_file.read()
        text = extract_text_from_pdf(content)
        pdf_type = detect_pdf_type(text)

        if pdf_type == "bank_statement":
            bank_data = parse_bank_pdf(content)
        else:
            financials = extract_financials(content)
            financials.pop("rawExtractedTextLength", None)
            financials.pop("metricsFound", None)
            financials.pop("extractionMethod", None)

        red_flags = detect_red_flags(text)
        raw_text_length = len(text)

    if gst_file and gst_file.filename:
        content = await gst_file.read()
        gst_analysis = parse_gst_csv(content, gst_file.filename)

    if bank_file and bank_file.filename:
        content = await bank_file.read()
        bank_data = parse_bank_statement(content, bank_file.filename)

    ratios = compute_ratios(financials) if financials else {}
    gst_turnover = gst_analysis.get("gstTurnover") or financials.get("revenue")
    bank_turnover = bank_data.get("bankTurnover")
    books_revenue = financials.get("revenue")
    cross_verification = cross_verify(gst_turnover, bank_turnover, books_revenue)
    itc_mismatch = compute_itc_mismatch(
        gst_analysis.get("itcClaimed"),
        gst_analysis.get("itcAvailable"),
    )

    return {
        "financials": financials,
        "ratios": ratios,
        "gstAnalysis": {
            **gst_analysis,
            "itcMismatchPercent": itc_mismatch.get("mismatchPercent"),
            "circularTradingRisk": itc_mismatch.get("circularTradingRisk", False),
        },
        "bankAnalysis": bank_data,
        "crossVerification": cross_verification,
        "redFlags": red_flags,
        "rawExtractedTextLength": raw_text_length,
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
