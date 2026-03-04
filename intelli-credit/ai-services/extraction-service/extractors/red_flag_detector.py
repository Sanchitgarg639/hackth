"""
Red-flag keyword detector.
Scans document text for audit/compliance risk keywords.
"""

# Keywords that indicate risk in annual reports
RED_FLAG_KEYWORDS = [
    "qualified opinion",
    "going concern",
    "emphasis of matter",
    "litigation",
    "default",
    "wilful defaulter",
    "NCLT",
    "insolvency",
    "fraud",
    "material weakness",
    "contingent liability",
    "disputed",
    "penalty",
    "show cause notice",
    "non-performing",
    "NPA",
    "write-off",
    "moratorium",
    "restructured",
    "one-time settlement",
    "regulatory action",
    "SEBI order",
    "RBI directive",
]


def detect_red_flags(text: str) -> list[dict]:
    """
    Scan text for red-flag keywords.
    Returns list of {keyword, found, context} dicts.
    """
    if not text:
        return []

    text_lower = text.lower()
    flags = []

    for keyword in RED_FLAG_KEYWORDS:
        kw_lower = keyword.lower()
        if kw_lower in text_lower:
            # Extract surrounding context (50 chars before/after)
            idx = text_lower.index(kw_lower)
            start = max(0, idx - 50)
            end = min(len(text), idx + len(keyword) + 50)
            context = text[start:end].replace('\n', ' ').strip()

            flags.append({
                "keyword": keyword,
                "found": True,
                "context": f"...{context}...",
            })

    return flags
