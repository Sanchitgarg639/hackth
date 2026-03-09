"""
Grade Mapper module.
Maps the composite 0-100 credit score into a human-readable Credit Grade
and calculates the final Credit Recommendation and Rates based on Prime base rate.
"""


def map_score_to_grade(score: int) -> str:
    """Returns the alphabetical grade for a given composite score (0-100)."""
    if score >= 85:
        return "AAA"
    if score >= 75:
        return "AA"
    if score >= 65:
        return "A"
    if score >= 55:
        return "BBB"
    if score >= 45:
        return "BB+"
    if score >= 30:
        return "B"
    return "C"


# Keep backward-compatible alias
map_pd_to_grade = map_score_to_grade


def generate_decision(score: int, grade: str) -> tuple:
    """
    Returns (Approval_Recommendation, Interest_Rate)
    Based on the composite score and grade.
    """
    prime_rate = 9.0  # Base repo + margin

    if grade in ["AAA", "AA"]:
        return "APPROVE", f"{prime_rate + 1.5:.1f}%"
    elif grade in ["A", "BBB"]:
        return "APPROVE_WITH_CONDITIONS", f"{prime_rate + 3.5:.1f}%"
    elif grade == "BB+":
        return "REFER_TO_COMMITTEE", f"{prime_rate + 5.0:.1f}%"
    elif grade == "B":
        return "REFER_TO_COMMITTEE", f"{prime_rate + 6.0:.1f}%"
    else:
        return "REJECT", "N/A"


def calculate_expected_loss(pd_prob: float, lgd: float = 0.45, requested_limit: float = 0) -> float:
    """
    Expected Loss = Probability of Default * Loss Given Default * Exposure at Default
    Assumes standard 45% LGD for unsecured/semi-secured corporate exposure.
    """
    if not requested_limit or requested_limit <= 0:
        requested_limit = 10_000_000
    return pd_prob * lgd * requested_limit
