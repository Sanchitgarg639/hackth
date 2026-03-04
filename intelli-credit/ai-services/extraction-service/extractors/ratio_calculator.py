"""
Financial ratio calculator.
Computes key credit ratios from extracted financial metrics.
"""


def compute_ratios(financials: dict) -> dict:
    """
    Compute financial ratios from extracted data.
    Returns dict with computed ratios. Uses None for incalculable values.
    """
    ratios = {
        "debtEquity": None,
        "currentRatio": None,
        "dscr": None,
        "interestCoverage": None,
        "debtToAssets": None,
        "returnOnEquity": None,
        "netProfitMargin": None,
    }

    net_worth = financials.get("netWorth")
    total_debt = financials.get("totalDebt")
    current_assets = financials.get("currentAssets")
    current_liabilities = financials.get("currentLiabilities")
    ebitda = financials.get("ebitda")
    interest_expense = financials.get("interestExpense")
    total_assets = financials.get("totalAssets")
    pat = financials.get("pat")
    revenue = financials.get("revenue")

    # Debt/Equity ratio
    if net_worth and net_worth != 0 and total_debt is not None:
        ratios["debtEquity"] = safe_round(total_debt / net_worth, 2)

    # Current Ratio
    if current_liabilities and current_liabilities != 0 and current_assets is not None:
        ratios["currentRatio"] = safe_round(current_assets / current_liabilities, 2)

    # DSCR (Debt Service Coverage Ratio)
    if interest_expense and interest_expense != 0 and ebitda is not None:
        ratios["dscr"] = safe_round(ebitda / interest_expense, 2)

    # Interest Coverage Ratio
    if interest_expense and interest_expense != 0 and ebitda is not None:
        ratios["interestCoverage"] = safe_round(ebitda / interest_expense, 2)

    # Debt to Assets
    if total_assets and total_assets != 0 and total_debt is not None:
        ratios["debtToAssets"] = safe_round(total_debt / total_assets, 2)

    # Return on Equity
    if net_worth and net_worth != 0 and pat is not None:
        ratios["returnOnEquity"] = safe_round((pat / net_worth) * 100, 2)

    # Net Profit Margin
    if revenue and revenue != 0 and pat is not None:
        ratios["netProfitMargin"] = safe_round((pat / revenue) * 100, 2)

    return ratios


def safe_round(value, decimals=2):
    """Safely round a value, return None if not numeric."""
    try:
        return round(float(value), decimals)
    except (TypeError, ValueError):
        return None
