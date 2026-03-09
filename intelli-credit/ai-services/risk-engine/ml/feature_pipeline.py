"""
Feature extraction pipeline for deterministic scoring.
Extracts raw metric values from the payload and DERIVES missing values
from related data whenever possible — never uses arbitrary defaults.
"""


def build_feature_vector(payload: dict) -> dict:
    """
    Extracts and COMPUTES all 12 credit risk metrics from the payload.
    If a metric isn't directly available, it attempts to derive it from
    related fields. Only returns None if truly no data exists to compute it.
    """

    fin = payload.get('extractedData', {}).get('financials', {})
    ratios = payload.get('extractedData', {}).get('ratios', {})
    cross = payload.get('extractedData', {}).get('crossVerification', {})
    gst_data = payload.get('extractedData', {}).get('gstAnalysis', {})
    balance = payload.get('extractedData', {}).get('balanceSheet', {})

    research = payload.get('researchFindings', {})
    qualitative = payload.get('qualitativeAssessment', {})
    inputs = payload.get('manualInputs', {})

    # 1. DEBT-TO-EQUITY RATIO
    de_ratio = _safe_float(ratios.get('debtEquity'))
    if de_ratio is None:
        # Derive from balance sheet: totalDebt / netWorth
        total_debt = _safe_float(fin.get('totalDebt') or fin.get('totalLiabilities'))
        net_worth = _safe_float(fin.get('netWorth'))
        if total_debt is not None and net_worth is not None and net_worth > 0:
            de_ratio = total_debt / net_worth
        elif total_debt is not None and net_worth is not None and net_worth <= 0:
            de_ratio = 10.0  # Negative net worth = extremely over-leveraged
        else:
            # Try assets - liabilities for equity
            total_assets = _safe_float(fin.get('totalAssets'))
            total_liab = _safe_float(fin.get('totalLiabilities'))
            if total_assets is not None and total_liab is not None and total_debt is not None:
                equity = total_assets - total_liab
                if equity > 0:
                    de_ratio = total_debt / equity
                else:
                    de_ratio = 10.0

    # 2. DEBT SERVICE COVERAGE RATIO (DSCR)
    dscr = _safe_float(ratios.get('dscr'))
    if dscr is None:
        # Derive: DSCR = (PAT + Depreciation + Interest) / (Interest + Principal repayments)
        pat = _safe_float(fin.get('pat') or fin.get('netProfit'))
        dep = _safe_float(fin.get('depreciation'))
        interest = _safe_float(fin.get('interestExpense'))
        ebitda = _safe_float(fin.get('ebitda'))

        if pat is not None and interest is not None and interest > 0:
            numerator = pat + (dep or 0) + interest
            dscr = numerator / interest
        elif ebitda is not None and interest is not None and interest > 0:
            dscr = ebitda / interest

    # 3. PAT MARGIN
    pat_val = _safe_float(fin.get('pat') or fin.get('netProfit'))
    rev_val = _safe_float(fin.get('revenue'))
    if pat_val is not None and rev_val is not None and rev_val > 0:
        pat_margin = pat_val / rev_val
    elif pat_val is not None and rev_val is not None and rev_val == 0:
        pat_margin = -1.0 if pat_val < 0 else 0.0  # No revenue = bad
    else:
        # Try EBITDA margin as proxy
        ebitda = _safe_float(fin.get('ebitda'))
        if ebitda is not None and rev_val is not None and rev_val > 0:
            pat_margin = (ebitda * 0.7) / rev_val  # Rough PAT estimate from EBITDA
        else:
            pat_margin = None

    # 4. GST VARIANCE (%)
    gst_variance = _safe_float(cross.get('variancePercent'))
    if gst_variance is None:
        # Derive from GST turnover vs reported revenue
        gst_turnover = _safe_float(fin.get('gstTurnover') or fin.get('gst_turnover'))
        if gst_turnover is not None and rev_val is not None and rev_val > 0:
            gst_variance = abs(gst_turnover - rev_val) / rev_val * 100.0

    # 5. ITC MISMATCH (%)
    itc_mismatch = _safe_float(gst_data.get('itcMismatchPercent'))
    # 6. AVERAGE SENTIMENT (-1 to +1)
    avg_sentiment = _safe_float(research.get('avg_sentiment'))
    if avg_sentiment is None:
        # Try to derive from news hits (supports multiple key conventions)
        news_hits = (research.get('newsHits') or research.get('news_hits')
                     or research.get('findings') or [])
        if news_hits and isinstance(news_hits, list):
            sentiments = []
            for n in news_hits:
                if not isinstance(n, dict):
                    continue
                s = _safe_float(
                    n.get('sentimentScore')       # camelCase
                    or n.get('sentiment_score')    # snake_case (research agent)
                )
                if s is not None:
                    sentiments.append(s)
            if sentiments:
                avg_sentiment = sum(sentiments) / len(sentiments)

    # 7. CRITICAL NEWS COUNT
    critical_news = _safe_float(research.get('critical_count'))
    if critical_news is None:
        news_hits = (research.get('newsHits') or research.get('news_hits')
                     or research.get('findings') or [])
        if isinstance(news_hits, list):
            critical_news = float(sum(
                1 for n in news_hits
                if isinstance(n, dict) and (
                    n.get('riskLevel') == 'high'
                    or n.get('sentimentLabel') == 'CRITICAL'
                    or n.get('sentiment_label') == 'CRITICAL'  # snake_case
                )
            ))

    # 8. FRAUD FLAG (binary)
    # Only score fraud if research was actually performed (has tags, hits, or sentiment).
    # If no research data exists at all, return None so the factor is excluded.
    unique_tags = research.get('unique_risk_tags') or []
    red_flags = payload.get('extractedData', {}).get('redFlags') or []
    has_research_data = bool(
        unique_tags or red_flags or
        research.get('avg_sentiment') is not None or
        research.get('critical_count') is not None or
        research.get('newsHits') or research.get('litigationHits')
    )

    if not has_research_data:
        fraud_flag = None  # No research done → exclude from scoring
    elif any(t in ['FRAUD', 'CRITICAL', 'ALERT'] for t in unique_tags) or len(red_flags) > 0:
        fraud_flag = 1.0  # Fraud signal found
    else:
        fraud_flag = 0.0  # Research done, no fraud found

    # 9. LITIGATION FLAG (binary)
    lit_hits = research.get('litigationHits') or []
    if not has_research_data:
        litigation_flag = None  # No research done → exclude from scoring
    elif 'LITIGATION' in unique_tags or any(
        isinstance(h, dict) and h.get('riskLevel') == 'high' for h in lit_hits
    ):
        litigation_flag = 1.0  # Litigation risk found
    else:
        litigation_flag = 0.0  # Research done, no litigation found

    # 10. SITE VISIT RATING (1-5)
    site_rating = _safe_float(qualitative.get('siteVisitRating'))
    # 11. MANAGEMENT QUALITY RATING (1-5)
    mgmt_rating = _safe_float(qualitative.get('managementQualityRating'))

    # 12. COLLATERAL COVERAGE
    collat_val = _safe_float(inputs.get('collateralValue'))
    loan_amt = _safe_float(inputs.get('requestedLimit'))
    if loan_amt is None:
        loan_amt = _safe_float(fin.get('totalDebt'))

    if collat_val is not None and loan_amt is not None and loan_amt > 0:
        collateral_coverage = collat_val / loan_amt
    else:
        collateral_coverage = None

    return {
        "de_ratio": de_ratio,
        "dscr": dscr,
        "pat_margin": pat_margin,
        "gst_variance": gst_variance,
        "itc_mismatch": itc_mismatch,
        "avg_sentiment": avg_sentiment,
        "critical_news": critical_news,
        "fraud_flag": fraud_flag,
        "litigation_flag": litigation_flag,
        "site_rating": site_rating,
        "mgmt_rating": mgmt_rating,
        "collateral_coverage": collateral_coverage,
    }


def _safe_float(val):
    """Convert to float safely — returns None if impossible."""
    if val is None:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None
