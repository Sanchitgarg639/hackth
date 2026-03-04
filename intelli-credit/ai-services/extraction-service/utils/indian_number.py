"""
Indian number format parser.
Converts formats like 1,23,45,678 or 12,34,56,789.00 to float.
"""

import re


def parse_indian_number(text: str) -> float | None:
    """
    Parse an Indian-formatted number string to float.
    Handles: 1,23,45,678 or 12345678 or 1,23,45,678.50
    """
    if not text or not isinstance(text, str):
        return None

    # Remove spaces, Rs., ₹, INR prefixes
    cleaned = re.sub(r'[₹Rs\.INR\s]', '', text.strip())

    # Remove commas
    cleaned = cleaned.replace(',', '')

    # Handle parentheses for negative numbers: (1234) → -1234
    if cleaned.startswith('(') and cleaned.endswith(')'):
        cleaned = '-' + cleaned[1:-1]

    # Handle Cr / Lakh suffixes
    multiplier = 1
    if cleaned.lower().endswith('cr') or cleaned.lower().endswith('crore'):
        cleaned = re.sub(r'(cr|crore)$', '', cleaned, flags=re.IGNORECASE).strip()
        multiplier = 10_000_000
    elif cleaned.lower().endswith('lakh') or cleaned.lower().endswith('lac'):
        cleaned = re.sub(r'(lakh|lac)$', '', cleaned, flags=re.IGNORECASE).strip()
        multiplier = 100_000

    try:
        return float(cleaned) * multiplier
    except (ValueError, TypeError):
        return None


def format_inr(value: float | None) -> str:
    """Format a number as Indian Rupees."""
    if value is None:
        return "N/A"
    if value < 0:
        return f"-₹{abs(value):,.0f}"
    return f"₹{value:,.0f}"
