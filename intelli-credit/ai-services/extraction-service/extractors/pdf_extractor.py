import random

def extract_financials(pdf_content):
    """
    Mock pdf extraction logic.
    In a real app, uses pdfplumber and regex to extract values.
    """
    return {
        "revenue": 5000000 + random.randint(-100000, 100000),
        "net_profit": 1500000 + random.randint(-50000, 50000),
        "liabilities": 2000000 + random.randint(-100000, 100000),
        "gst_turnover": 5500000 + random.randint(-100000, 100000)
    }
