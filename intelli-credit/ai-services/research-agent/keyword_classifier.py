"""
Keyword Risk Classifier
Scans text for predefined risk categories and tags them.
"""

RISK_KEYWORDS = {
    "LITIGATION": ["court", "case", "petition", "hearing", "lawsuit", "sued", "supreme court", "high court", "tribunal"],
    "FRAUD": ["fraud", "scam", "misappropriation", "embezzlement", "money laundering", "forgery", "fake", "evasion"],
    "REGULATORY": ["rbi notice", "sebi action", "penalty", "show cause", "ed raid", "cbi probe", "compliance issue", "investigation"],
    "PROMOTER_RISK": ["resignation", "related party", "conflict of interest", "arrested", "fled", "defaulter", "wilful defaulter"],
    "SECTOR_HEADWIND": ["slowdown", "policy change", "ban", "tariff", "supply chain disruption", "headwinds"],
    "FINANCIAL_DISTRESS": ["insolvency", "nclt", "bankruptcy", "default", "rating downgrade", "liquidity crisis", "debt restructuring"],
}

LITIGATION_FRAUD_KEYWORDS = ["LITIGATION", "FRAUD", "PROMOTER_RISK"]

def detect_keywords(text: str, sentiment_score: float = 0.0) -> list[str]:
    """
    Checks the text against the dictionary classes and returns a list of risk tags.
    For high-severity flags (Fraud, Litigation), requires explicit negative sentiment (score < -0.1).
    """
    if not text:
        return []
        
    text_lower = text.lower()
    tags = set()
    
    for category, keywords in RISK_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            # Guard high-severity flags with a negative sentiment requirement
            # to avoid flagging resolved or neutral keyword mentions
            if category in LITIGATION_FRAUD_KEYWORDS:
                if sentiment_score < -0.1:
                    tags.add(category)
            else:
                tags.add(category)
            
    return list(tags)
