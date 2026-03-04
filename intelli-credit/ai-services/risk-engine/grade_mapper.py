"""
Grade Mapper module.
Maps the Probability of Default (PD) into a human-readable Credit Grade
and calculates the final Credit Recommendation and Rates based on Prime base rate.
"""
def map_pd_to_grade(pd_prob: float) -> str:
    """Returns the alphabetical grade for a given probability of default."""
    if pd_prob < 0.02: return "AAA"
    if pd_prob < 0.05: return "AA"
    if pd_prob < 0.08: return "A"
    if pd_prob < 0.12: return "BBB"
    if pd_prob < 0.20: return "BB+"
    if pd_prob < 0.35: return "B"
    return "C"

def generate_decision(pd_prob: float, grade: str) -> tuple[str, str]:
    """
    Returns (Approval_Recommendation, Interest_Rate)
    """
    prime_rate = 9.0  # Base repo + margin

    if grade in ["AAA", "AA", "A"]:
        return "APPROVE", f"{prime_rate + 1.5:.1f}%"
    elif grade in ["BBB", "BB+"]:
        return "APPROVE_WITH_CONDITIONS", f"{prime_rate + 3.5:.1f}%"
    elif grade == "B":
        return "REFER_TO_COMMITTEE", f"{prime_rate + 6.0:.1f}%"
    else:
        return "REJECT", "N/A"

def calculate_expected_loss(pd_prob: float, lGD: float = 0.45, requested_limit: float = 0) -> float:
    """
    Expected Loss = Probability of Default * Loss Given Default * Exposure at Default
    Assumes standard 45% LGD for unsecured/semi-secured corporate exposure.
    """
    if not requested_limit or requested_limit <= 0:
        requested_limit = 10_000_000 # default proxy to £1M
        
    return pd_prob * lGD * requested_limit
