import random

def calculate_risk(financial_data, research_data):
    """
    Mock risk calculation.
    """
    fin_score = random.randint(30, 60)
    lit_score = 0 if research_data.get('litigation_flag') else 20
    sector_score = 15

    final_score = fin_score + lit_score + sector_score
    
    decision = "APPROVE" if final_score >= 70 else "REVIEW"
    if final_score < 50:
        decision = "REJECT"

    return {
        "final_score": final_score,
        "breakdown": {
            "financial_score": fin_score,
            "litigation_score": lit_score,
            "sector_score": sector_score
        },
        "decision": decision,
        "recommended_limit": random.randint(100, 1000) * 1000 if decision == "APPROVE" else 0,
        "interest_rate": round(random.uniform(7.0, 15.0), 2)
    }
