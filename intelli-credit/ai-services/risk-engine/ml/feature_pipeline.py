"""
Feature extraction pipeline used during live inference.
Takes nested JSON structure and flattens it into the exact
column format expected by the XGBoost Risk Engine Model.
"""
import pandas as pd
import numpy as np

EXPECTED_FEATURES = [
    "de_ratio", "dscr", "pat_margin", "gst_variance", 
    "itc_mismatch", "avg_sentiment", "critical_news", 
    "fraud_flag", "litigation_flag", "site_rating", 
    "mgmt_rating", "collateral_coverage"
]

def build_feature_vector(payload: dict) -> pd.DataFrame:
    """
    Given the aggregated payload across all phases (Financial, DB, Qualitative, Research),
    builds the Pandas DataFrame for inference.
    """
    
    fin = payload.get('extractedData', {}).get('financials', {})
    ratios = payload.get('extractedData', {}).get('ratios', {})
    cross = payload.get('extractedData', {}).get('crossVerification', {})
    gst = payload.get('extractedData', {}).get('gstAnalysis', {})
    
    research = payload.get('researchFindings', {})
    qualitative = payload.get('qualitativeAssessment', {})
    
    # Extra inputs
    inputs = payload.get('manualInputs', {})

    
    # ── Safe Extract defaults ──
    # Ratios
    de_ratio = ratios.get('debtEquity')
    if de_ratio is None: de_ratio = 1.0
    
    dscr = ratios.get('dscr')
    if dscr is None: dscr = 1.5

    # Pat margin
    pat = fin.get('pat') or 0
    rev = fin.get('revenue') or 1  # prevent div 0
    pat_margin = pat / rev
    
    # GST / Tax
    gst_var = cross.get('variancePercent') or 0.0
    itc_mismatch = gst.get('itcMismatchPercent') or 0.0
    
    # NLP Data
    avg_sentiment = research.get('avg_sentiment') or 0.0
    critical_news = research.get('critical_count') or 0
    unique_tags = research.get('unique_risk_tags') or []
    fraud_flag = 1 if 'FRAUD' in unique_tags else 0
    litigation_flag = 1 if 'LITIGATION' in unique_tags else 0
    
    # Qualitative
    site_rating = qualitative.get('siteVisitRating') or 3
    mgmt_rating = qualitative.get('managementQualityRating') or 3
    
    # Collateral
    collat_val = inputs.get('collateralValue') or 0
    loan_amt = inputs.get('requestedLimit') or fin.get('totalDebt') or 1
    collateral_coverage = collat_val / loan_amt
    
    # Build dictionary
    vector = {
        "de_ratio": float(de_ratio),
        "dscr": float(dscr),
        "pat_margin": float(pat_margin),
        "gst_variance": float(gst_var) / 100.0, # Convert % to decimal
        "itc_mismatch": float(itc_mismatch) / 100.0,
        "avg_sentiment": float(avg_sentiment),
        "critical_news": float(critical_news),
        "fraud_flag": float(fraud_flag),
        "litigation_flag": float(litigation_flag),
        "site_rating": float(site_rating),
        "mgmt_rating": float(mgmt_rating),
        "collateral_coverage": float(collateral_coverage)
    }

    df = pd.DataFrame([vector])
    # Ensure explicit order matches training
    df = df[EXPECTED_FEATURES]
    return df

