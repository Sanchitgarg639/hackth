"""
Extraction Service — Multi-Format Financial Parser (Phase 2)
Accepts PDF (annual reports OR bank statements), GST CSV, and Bank Statement CSV.
Returns structured financial metrics with ratios, flags, and cross-verification.

KEY FIX: Detects whether a PDF is a bank statement or annual report
and routes to the appropriate parser.
"""

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import uvicorn
import logging
import os
import io
import re

from extractors.pdf_extractor import extract_financials, extract_text_from_pdf
from extractors.financial_parser import parse_gst_csv, compute_itc_mismatch
from extractors.bank_parser import parse_bank_statement, parse_bank_pdf
from extractors.ratio_calculator import compute_ratios
from extractors.red_flag_detector import detect_red_flags
from extractors.cross_verifier import cross_verify

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Extraction Service", version="0.2.0")

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
    """
    Detect whether a PDF is a bank statement or annual report.
    Returns 'bank_statement' or 'annual_report'.
    """
    if not text:
        return "annual_report"

    text_lower = text[:5000].lower()  # Check first ~5000 chars

    bank_score = sum(1 for kw in BANK_STATEMENT_KEYWORDS if kw in text_lower)
    annual_score = sum(1 for kw in ANNUAL_REPORT_KEYWORDS if kw in text_lower)

    logger.info(f"PDF type detection — bank_score={bank_score}, annual_score={annual_score}")

    if bank_score > annual_score:
        return "bank_statement"
    elif annual_score > bank_score:
        return "annual_report"
    else:
        # Tie-breaker: check for tabular patterns common in bank statements
        # (dates + amounts in structured rows)
        date_amount_pattern = r'\d{2}[/-]\d{2}[/-]\d{2,4}\s+.*\d[\d,]+\.\d{2}'
        if len(re.findall(date_amount_pattern, text[:3000])) >= 3:
            return "bank_statement"
        return "annual_report"


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
        "version": "0.2",
        "ocr": ocr_status,
    }


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
        # ── STEP 1: Extract text and detect PDF type ─────
        text = extract_text_from_pdf(content)
        raw_text_length = len(text)
        pdf_type = detect_pdf_type(text)

        logger.info(f"PDF detected as: {pdf_type} (text length: {raw_text_length})")

        if pdf_type == "bank_statement":
            # ── PDF Bank Statement ───────────────────────
            bank_data = parse_bank_pdf(content)
            logger.info(f"Bank PDF parsed: turnover={bank_data.get('bankTurnover')}, "
                        f"txns={bank_data.get('transactionCount')}")

            # Still scan for red flags in the text
            red_flags = detect_red_flags(text)

        else:
            # ── PDF Annual Report ────────────────────────
            financials = extract_financials(content)
            raw_text_length = financials.pop("rawExtractedTextLength", raw_text_length)
            financials.pop("metricsFound", None)
            financials.pop("extractionMethod", None)

            # Detect red flags
            red_flags = detect_red_flags(text)

    elif file_ext == ".csv":
        # ── CSV Detection ─────────────────────────────────
        fname_lower = filename.lower()

        if "gst" in fname_lower or "gstr" in fname_lower or "3b" in fname_lower or "2a" in fname_lower:
            gst_analysis = parse_gst_csv(content, filename)
        elif "bank" in fname_lower or "statement" in fname_lower:
            bank_data = parse_bank_statement(content, filename)
        else:
            # Try both and keep whichever succeeds
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
    """
    Accept multiple files at once — PDF + GST CSV + Bank CSV.
    """
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
