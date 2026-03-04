"""
GST Return Parser.
Parses GSTR-3B and GSTR-2A CSV files to extract turnover and ITC data.
Computes ITC mismatch percentage for circular trading detection.
"""

import io
import logging

logger = logging.getLogger(__name__)

try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False
    logger.warning("pandas not available — CSV parsing disabled")


def parse_gst_csv(content: bytes, filename: str = "") -> dict:
    """
    Parse GST return CSV.
    Detects format (GSTR-3B or GSTR-2A) and extracts relevant data.
    Returns structured GST analysis dict.
    """
    result = {
        "gstTurnover": None,
        "itcClaimed": None,
        "itcAvailable": None,
        "itcMismatchPercent": None,
        "circularTradingRisk": False,
        "monthlyData": [],
        "fileType": "unknown",
        "analysis": "Unable to parse GST data",
    }

    if not HAS_PANDAS:
        result["analysis"] = "pandas not installed — CSV parsing unavailable"
        return result

    try:
        # Read CSV, try different encodings
        df = None
        for encoding in ['utf-8', 'latin-1', 'cp1252']:
            try:
                df = pd.read_csv(io.BytesIO(content), encoding=encoding)
                break
            except UnicodeDecodeError:
                continue

        if df is None or df.empty:
            result["analysis"] = "Empty or unreadable CSV file"
            return result

        # Normalize column names
        df.columns = [str(c).strip().lower().replace(' ', '_') for c in df.columns]

        # Detect file type from columns or filename
        fname_lower = filename.lower()
        columns_str = ' '.join(df.columns)

        if '3b' in fname_lower or 'outward' in columns_str or 'taxable_value' in columns_str:
            result["fileType"] = "GSTR-3B"
            result = _parse_gstr3b(df, result)
        elif '2a' in fname_lower or 'supplier' in columns_str or 'itc_available' in columns_str:
            result["fileType"] = "GSTR-2A"
            result = _parse_gstr2a(df, result)
        else:
            # Try generic parsing
            result = _parse_generic_gst(df, result)

    except Exception as e:
        logger.error(f"GST CSV parsing error: {e}")
        result["analysis"] = f"Parsing error: {str(e)}"

    return result


def _parse_gstr3b(df, result: dict) -> dict:
    """Parse GSTR-3B format CSV."""
    # Look for taxable value / turnover columns
    turnover_cols = [c for c in df.columns if any(k in c for k in ['taxable', 'turnover', 'outward', 'supply'])]
    itc_cols = [c for c in df.columns if any(k in c for k in ['itc', 'input_tax', 'credit_claimed'])]

    if turnover_cols:
        try:
            df[turnover_cols[0]] = pd.to_numeric(df[turnover_cols[0]], errors='coerce')
            result["gstTurnover"] = float(df[turnover_cols[0]].sum())
        except Exception:
            pass

    if itc_cols:
        try:
            df[itc_cols[0]] = pd.to_numeric(df[itc_cols[0]], errors='coerce')
            result["itcClaimed"] = float(df[itc_cols[0]].sum())
        except Exception:
            pass

    # Build monthly data
    month_col = _find_month_column(df)
    if month_col and turnover_cols:
        for _, row in df.iterrows():
            try:
                entry = {
                    "month": str(row.get(month_col, "Unknown")),
                    "taxableValue": _safe_float(row.get(turnover_cols[0])),
                }
                if itc_cols:
                    entry["itcClaimed"] = _safe_float(row.get(itc_cols[0]))
                result["monthlyData"].append(entry)
            except Exception:
                continue

    result["analysis"] = f"GSTR-3B parsed: turnover={result['gstTurnover']}, ITC claimed={result['itcClaimed']}"
    return result


def _parse_gstr2a(df, result: dict) -> dict:
    """Parse GSTR-2A format CSV."""
    itc_cols = [c for c in df.columns if any(k in c for k in ['itc', 'input_tax', 'credit', 'tax_amount'])]

    if itc_cols:
        try:
            df[itc_cols[0]] = pd.to_numeric(df[itc_cols[0]], errors='coerce')
            result["itcAvailable"] = float(df[itc_cols[0]].sum())
        except Exception:
            pass

    result["analysis"] = f"GSTR-2A parsed: ITC available from suppliers={result['itcAvailable']}"
    return result


def _parse_generic_gst(df, result: dict) -> dict:
    """Try generic parsing for unrecognized GST format."""
    # Sum all numeric columns that might be financial
    for col in df.columns:
        col_lower = col.lower()
        try:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        except Exception:
            continue

        if any(k in col_lower for k in ['turnover', 'taxable', 'supply', 'revenue']):
            result["gstTurnover"] = float(df[col].sum())
        elif any(k in col_lower for k in ['itc', 'credit', 'input']):
            result["itcClaimed"] = float(df[col].sum())

    result["fileType"] = "Generic GST"
    result["analysis"] = "Generic GST format parsed"
    return result


def compute_itc_mismatch(gstr3b_itc: float | None, gstr2a_itc: float | None) -> dict:
    """
    Compute ITC mismatch between GSTR-3B (claimed) and GSTR-2A (available).
    High mismatch indicates potential circular trading.
    """
    result = {
        "itcClaimed_3B": gstr3b_itc,
        "itcAvailable_2A": gstr2a_itc,
        "mismatchPercent": None,
        "circularTradingRisk": False,
        "analysis": "Insufficient data for ITC mismatch",
    }

    if gstr3b_itc is None or gstr2a_itc is None:
        return result

    if gstr2a_itc == 0:
        if gstr3b_itc > 0:
            result["mismatchPercent"] = 100.0
            result["circularTradingRisk"] = True
            result["analysis"] = "CRITICAL: ITC claimed but no supplier-reported ITC available"
        return result

    mismatch = abs(gstr3b_itc - gstr2a_itc) / gstr2a_itc * 100
    result["mismatchPercent"] = round(mismatch, 2)

    if mismatch > 20:
        result["circularTradingRisk"] = True
        result["analysis"] = f"HIGH RISK: {mismatch:.1f}% ITC mismatch — possible circular trading"
    elif mismatch > 10:
        result["circularTradingRisk"] = True
        result["analysis"] = f"WARNING: {mismatch:.1f}% ITC mismatch — needs investigation"
    elif mismatch > 5:
        result["analysis"] = f"Minor ITC mismatch ({mismatch:.1f}%). Within tolerance."
    else:
        result["analysis"] = f"ITC figures consistent ({mismatch:.1f}% mismatch). Low risk."

    return result


def _find_month_column(df) -> str | None:
    """Find the column containing month/period data."""
    for col in df.columns:
        if any(k in col.lower() for k in ['month', 'period', 'date', 'return_period']):
            return col
    return None


def _safe_float(val) -> float | None:
    """Safely convert to float."""
    try:
        import numpy as np
        if pd.isna(val) or (isinstance(val, float) and np.isnan(val)):
            return None
        return float(val)
    except (TypeError, ValueError):
        return None
