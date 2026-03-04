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

def detect_keywords(text: str) -> list[str]:
    """
    Checks the text against the dictionary classes and returns a list of risk tags.
    """
    if not text:
        return []
        
    text_lower = text.lower()
    tags = set()
    
    for category, keywords in RISK_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            tags.add(category)
            
    return list(tags)
