def _calculate_financial_score(financial_data: dict) -> int:
    """Calculate financial score based on profit margin, debt ratio, and GST variance. Max 60."""
    score = 0
    
    # Safely get values, default to 0 if missing or negative where inappropriate
    revenue = max(0.001, float(financial_data.get("revenue", 0.001))) # Prevent div by 0
    net_profit = float(financial_data.get("net_profit", 0.0))
    total_liabilities = float(financial_data.get("total_liabilities", 0.0))
    total_assets = max(0.001, float(financial_data.get("total_assets", 0.001))) # Prevent div by 0
    gst_turnover = max(0.001, float(financial_data.get("gst_turnover", 0.001))) # Prevent div by 0
    bank_credits = float(financial_data.get("bank_credits", gst_turnover)) # Default to no variance if missing

    # 1. Profit Margin Score (Max 25)
    profit_margin = net_profit / revenue
    if profit_margin > 0.15:
        score += 25
    elif profit_margin >= 0.08:
        score += 18
    elif profit_margin >= 0.03:
        score += 10
    else:
        score += 4

    # 2. Debt Ratio Score (Max 20)
    debt_ratio = total_liabilities / total_assets
    if debt_ratio < 0.4:
        score += 20
    elif debt_ratio <= 0.7:
        score += 12
    else:
        score += 5

    # 3. GST-Bank Variance Score (Max 15)
    variance = abs(gst_turnover - bank_credits) / gst_turnover
    if variance < 0.05:
        score += 15
    elif variance <= 0.15:
        score += 8
    else:
        score += 2

    return min(60, score)  # Cap score


def _calculate_research_score(research_data: dict) -> int:
    """Calculate research score based on litigation, negative news, and sentiment. Max 30."""
    score = 0
    
    # 1. Litigation Score (Max 15)
    # Mapping 'litigation_flag' which could be string or boolean depending on structure
    litigation = str(research_data.get("litigation_flag", "no")).lower()
    if litigation in ["false", "0", "no", "none"]:
        score += 15
    elif litigation in ["minor", "low"]:
        score += 8
    else: # Major, true, yes, high, etc.
        score += 2
        
    # 2. News Score (Max 10)
    news_count = int(research_data.get("negative_news_score", 0))
    if news_count == 0:
        score += 10
    elif news_count <= 3:
        score += 5
    else:
        score += 1
        
    # 3. Sentiment Score (Max 5)
    sentiment = float(research_data.get("sentiment_score", 0.0))
    if sentiment > 0.2:
        score += 5
    elif sentiment >= -0.2:
        score += 3
    else:
        score += 1

    return min(30, score) # Cap score


def _calculate_sector_score(research_data: dict) -> int:
    """Calculate sector risk score. Max 10."""
    sector_risk = int(research_data.get("sector_risk_score", 5)) # Default moderate risk
    
    if sector_risk <= 3:
        return 10
    elif sector_risk <= 6:
        return 6
    else:
        return 3


def calculate_risk(financial_data: dict, research_data: dict) -> dict:
    """
    Deterministic risk calculation based on financial, research and sector data.
    """
    # Calculate individual components
    fin_score = _calculate_financial_score(financial_data)
    res_score = _calculate_research_score(research_data)
    sector_score = _calculate_sector_score(research_data)

    # Calculate final score (Max 100)
    final_score = fin_score + res_score + sector_score
    final_score = min(100, max(0, final_score)) # Clamp between 0-100
    
    # Determine decision logic
    if final_score >= 75:
        decision = "APPROVE"
    elif final_score >= 60:
        decision = "REVIEW"
    else:
        decision = "REJECT"

    # Determine recommended limit based on revenue
    revenue = float(financial_data.get("revenue", 0.0))
    if decision == "APPROVE":
        recommended_limit = int(revenue * 0.25)
    elif decision == "REVIEW":
        recommended_limit = int(revenue * 0.10)
    else:
        recommended_limit = 0
        
    # Determine interest rate
    if final_score >= 85:
        interest_rate = 8.0
    elif final_score >= 75:
        interest_rate = 9.5
    elif final_score >= 65:
        interest_rate = 11.5
    else:
        interest_rate = 13.5

    return {
        "final_score": final_score,
        "breakdown": {
            "financial_score": fin_score,
            "research_score": res_score,
            "sector_score": sector_score
        },
        "decision": decision,
        "recommended_limit": recommended_limit,
        "interest_rate": interest_rate
    }
