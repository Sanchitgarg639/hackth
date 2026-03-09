"""
SHAP Explainability service.
Converts opaque ML predictions into human-readable narratives
that act as the credit justification.
"""
import shap
import numpy as np

# A mapper dictionary to turn feature names into readable English
FEATURE_DESCRIPTIONS = {
    "de_ratio": "Debt-to-Equity Ratio",
    "dscr": "Debt Service Coverage Ratio (DSCR)",
    "pat_margin": "Net Profit Margin",
    "gst_variance": "GST turnover variance",
    "itc_mismatch": "Input Tax Credit mismatch",
    "avg_sentiment": "Average News Sentiment",
    "critical_news": "Critical News Count",
    "fraud_flag": "Fraud Risk Keyword Tags",
    "litigation_flag": "Litigation Risk Keyword Tags",
    "site_rating": "Site Visit Check",
    "mgmt_rating": "Management Quality Assessment",
    "collateral_coverage": "Collateral Coverage"
}

def generate_explanations(explainer, model, features_df):
    """
    Given an explainer, model, and the dataframe representing a single company,
    calculates the SHAP values and strings them into reasons.
    """
    # Base probability calculation to ground the percentage values
    shap_values = explainer.shap_values(features_df)
    
    # SHAP returns raw log-odds (margin) space.
    # Convert base_value to probability space
    base_value = explainer.expected_value
    
    # XGBClassifier returns a list for Binary [class0, class1] or a single array
    # If it's a list, we want class 1 (Probability of Default)
    if isinstance(shap_values, list):
        values = shap_values[1][0]
        if isinstance(base_value, (list, np.ndarray)):
            base_value = base_value[1]
    else:
        # If it's a single array, it usually represents the log-odds of class 1
        values = shap_values[0]
        if isinstance(base_value, (list, np.ndarray)):
            base_value = base_value[-1]
            
    reasons = []
    
    # Sort features by absolute impact magnitude
    indices = np.argsort(np.abs(values))[::-1]
    
    # Take top 4 most impactful features to show to human
    for idx in indices[:4]:
        impact = values[idx]
        feature_name = features_df.columns[idx]
        feature_val = features_df.iloc[0, idx]
        
        # We can approximate 'marginal PD contribution' as impact / 10 if we want it intuitive,
        # or we just talk about directional risk
        desc = FEATURE_DESCRIPTIONS.get(feature_name, feature_name)
        
        # Round feature value somewhat nicely
        if feature_name in ['de_ratio', 'dscr', 'collateral_coverage']:
            val_str = f"{feature_val:.2f}x"
        elif feature_name in ['pat_margin', 'gst_variance', 'itc_mismatch']:
            val_str = f"{feature_val*100:.1f}%"
        elif feature_name in ['critical_news']:
            val_str = f"{int(feature_val)} article(s)"
        elif feature_name in ['fraud_flag', 'litigation_flag']:
            val_str = "Present" if feature_val else "Absent"
        elif feature_name in ['site_rating', 'mgmt_rating']:
            val_str = f"{int(feature_val)}/5"
        else:
            val_str = f"{feature_val:.2f}"
            
        if impact > 0.1: # Increased risk
            reason = f"{desc} of {val_str} significantly increased the probability of default."
            reasons.append({"factor": "Risk Driver", "text": reason, "impact": "+Risk"})
        elif impact < -0.1: # Decreased risk
            reason = f"{desc} of {val_str} strongly supported the credit quality, reducing default probability."
            reasons.append({"factor": "Mitigant", "text": reason, "impact": "-Risk"})
        else:
            reason = f"{desc} hovered at benchmark normals ({val_str}) resulting in minimal impact."
            reasons.append({"factor": "Neutral", "text": reason, "impact": "Neutral"})
            
    return reasons
