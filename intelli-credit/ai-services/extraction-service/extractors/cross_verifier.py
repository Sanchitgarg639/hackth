"""
Cross-verification logic.
Compares GST turnover vs Bank credit turnover to detect revenue inflation.
"""


def cross_verify(gst_turnover: float | None, bank_turnover: float | None, books_revenue: float | None = None) -> dict:
    """
    Compare GST-reported turnover with bank transaction credits and books revenue.
    A high variance suggests potential revenue inflation or circular trading.
    """
    result = {
        "gstTurnover": gst_turnover,
        "bankTurnover": bank_turnover,
        "booksRevenue": books_revenue,
        "variancePercent": None,
        "revenueInflationFlag": False,
        "circularTradingRisk": False,
        "analysis": "Insufficient data for cross-verification",
        "flags": []
    }

    if not gst_turnover:
        return result

    analysis_messages = []
    
    # 1. GST vs Books (Revenue Inflation)
    if books_revenue and books_revenue > 0:
        variance_gst_vs_books = abs(gst_turnover - books_revenue) / books_revenue * 100
        if variance_gst_vs_books > 15:
            result["revenueInflationFlag"] = True
            result["flags"].append({
                "type": "REVENUE_INFLATION",
                "severity": "CRITICAL",
                "message": f"GST turnover vs books variance: {variance_gst_vs_books:.1f}% — possible revenue inflation"
            })
            analysis_messages.append(f"Revenue inflation risk: {variance_gst_vs_books:.1f}% variance.")

    # 2. Bank vs GST (Circular Trading)
    if bank_turnover and gst_turnover > 0:
        variance_bank_vs_gst = abs(bank_turnover - gst_turnover) / gst_turnover * 100
        result["variancePercent"] = round(variance_bank_vs_gst, 2)
        if variance_bank_vs_gst > 15:
            result["circularTradingRisk"] = True
            result["flags"].append({
                "type": "CIRCULAR_TRADING", 
                "severity": "CRITICAL",
                "message": f"Bank credits vs GST turnover variance: {variance_bank_vs_gst:.1f}%"
            })
            analysis_messages.append(f"Circular trading risk: {variance_bank_vs_gst:.1f}% variance between bank and GST.")
            
    if analysis_messages:
        result["analysis"] = " | ".join(analysis_messages)
    elif bank_turnover and books_revenue:
        result["analysis"] = "Turnover figures are consistent across GST, Bank, and Books. Low risk."
    elif bank_turnover:
        result["analysis"] = "Bank and GST figures are consistent."

    return result
