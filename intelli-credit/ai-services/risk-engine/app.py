from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn

app = FastAPI(title="Risk Engine Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RiskRequest(BaseModel):
    extractedData: Optional[dict] = {}
    researchFindings: Optional[dict] = {}
    financial_data: Optional[dict] = {}
    research_data: Optional[dict] = {}

class TriangulateRequest(BaseModel):
    extracted_financials: Optional[dict] = {}
    research_findings: Optional[dict] = {}
    entity_details: Optional[dict] = {}
    loan_details: Optional[dict] = {}

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "risk-engine", "version": "2.0.0"}


# ── 12-Factor Scoring Definitions ───────────────────────
FACTORS = [
    {"name": "Asset Strength", "weight": 12, "key": "totalAssets", "threshold": 50000000, "above_msg": "Strong asset base (>₹5Cr)", "below_msg": "Limited asset base"},
    {"name": "GST Compliance", "weight": 10, "key": "gstTurnover", "threshold": 100000000, "above_msg": "Strong GST turnover (>₹10Cr)", "below_msg": "Moderate GST turnover"},
    {"name": "Debt Service Coverage", "weight": 12, "key": "dscr", "threshold": 1.2, "above_msg": "Healthy DSCR (>1.2x)", "below_msg": "Weak DSCR (<1.2x)"},
    {"name": "Current Ratio", "weight": 8, "key": "currentRatio", "threshold": 1.0, "above_msg": "Adequate liquidity", "below_msg": "Liquidity stress"},
    {"name": "Profitability", "weight": 10, "key": "pat", "threshold": 0, "above_msg": "Profitable operations", "below_msg": "Loss-making entity"},
    {"name": "Leverage", "weight": 8, "key": "debtEquity", "threshold": 3.0, "above_msg": "Reasonable leverage", "below_msg": "High leverage (>3x D/E)", "inverse": True},
    {"name": "Revenue Scale", "weight": 8, "key": "revenue", "threshold": 50000000, "above_msg": "Strong revenue base (>₹5Cr)", "below_msg": "Small revenue base"},
    {"name": "Litigation Risk", "weight": 8, "key": "_litigation", "threshold": None},
    {"name": "Market Sentiment", "weight": 6, "key": "_sentiment", "threshold": None},
    {"name": "Sector Cyclicality", "weight": 6, "key": "_sector", "threshold": None},
    {"name": "Management Quality", "weight": 6, "key": "_management", "threshold": None},
    {"name": "Cross-Verification", "weight": 6, "key": "_crossverify", "threshold": None},
]


def _get_financial_value(fin: dict, key: str) -> float:
    """Extract a financial value from nested data structures."""
    # Direct key
    if key in fin:
        try:
            return float(fin[key])
        except (TypeError, ValueError):
            return 0
    # Check in balanceSheet
    bs = fin.get("balanceSheet", {})
    if key in bs:
        try:
            return float(bs[key])
        except (TypeError, ValueError):
            return 0
    # Check in ratios
    ratios = fin.get("ratios", {})
    if key in ratios and ratios[key] is not None:
        try:
            return float(ratios[key])
        except (TypeError, ValueError):
            return 0
    return 0


@app.post("/score")
def score_company(req: RiskRequest):
    """
    Credit risk scoring with explainable 12-factor reasoning.
    """
    fin = req.extractedData or req.financial_data or {}
    research = req.researchFindings or req.research_data or {}

    reasoning = []
    total_weighted_score = 0

    for factor in FACTORS:
        entry = {
            "factor_name": factor["name"],
            "weight_pct": factor["weight"],
            "raw_value": "",
            "score": 0,
            "weighted_contribution": 0,
            "reasoning": "",
            "direction": "neutral",
        }

        if factor["key"].startswith("_"):
            # Special factors
            if factor["key"] == "_litigation":
                litigation = research.get("litigationHits", [])
                has_high = any(h.get("riskLevel") == "high" for h in litigation if isinstance(h, dict))
                if has_high:
                    entry["score"] = 20
                    entry["raw_value"] = "Active high-risk litigation"
                    entry["reasoning"] = "Pending litigation poses material credit risk"
                    entry["direction"] = "negative"
                else:
                    entry["score"] = 85
                    entry["raw_value"] = "Clean litigation record"
                    entry["reasoning"] = "No material litigation found — positive signal"
                    entry["direction"] = "positive"

            elif factor["key"] == "_sentiment":
                news = research.get("newsHits", [])
                positive = sum(1 for n in news if isinstance(n, dict) and n.get("sentiment") == "positive")
                agg = research.get("aggregate_sentiment", 0.5)
                if positive >= 2 or agg > 0.5:
                    entry["score"] = 80
                    entry["raw_value"] = f"{positive} positive articles, sentiment={agg:.2f}"
                    entry["reasoning"] = f"Positive market sentiment ({positive} favorable articles)"
                    entry["direction"] = "positive"
                else:
                    entry["score"] = 50
                    entry["raw_value"] = f"{positive} positive articles"
                    entry["reasoning"] = "Mixed market sentiment"
                    entry["direction"] = "neutral"

            elif factor["key"] == "_sector":
                entry["score"] = 60
                entry["raw_value"] = "Standard sector risk"
                entry["reasoning"] = "Standard cyclicality deduction for sector"
                entry["direction"] = "neutral"

            elif factor["key"] == "_management":
                mgmt = research.get("managementQualityRating", 3.5)
                entry["score"] = min(100, int(mgmt * 20)) if isinstance(mgmt, (int, float)) else 70
                entry["raw_value"] = f"Rating: {mgmt}/5"
                entry["reasoning"] = f"Management quality rated {mgmt}/5"
                entry["direction"] = "positive" if entry["score"] >= 70 else "neutral"

            elif factor["key"] == "_crossverify":
                cv = fin.get("crossVerification", {})
                variance = cv.get("variancePercent", 0)
                if variance and variance > 15:
                    entry["score"] = 30
                    entry["raw_value"] = f"Variance: {variance:.1f}%"
                    entry["reasoning"] = f"Revenue inflation suspected — {variance:.1f}% GST/Bank variance"
                    entry["direction"] = "negative"
                else:
                    entry["score"] = 85
                    entry["raw_value"] = f"Variance: {variance:.1f}%" if variance else "Consistent"
                    entry["reasoning"] = "Financial figures are internally consistent"
                    entry["direction"] = "positive"

        else:
            # Numeric factors
            value = _get_financial_value(fin, factor["key"])
            threshold = factor["threshold"]
            is_inverse = factor.get("inverse", False)

            entry["raw_value"] = f"{factor['name']}: {value:,.2f}" if value else f"{factor['name']}: N/A"

            if value:
                if is_inverse:
                    if value <= threshold:
                        entry["score"] = 80
                        entry["reasoning"] = f"{factor['above_msg']} — {factor['key']} at {value:.2f}x within acceptable range"
                        entry["direction"] = "positive"
                    else:
                        entry["score"] = 30
                        entry["reasoning"] = f"{factor['below_msg']} — {factor['key']} at {value:.2f}x exceeds {threshold}x threshold"
                        entry["direction"] = "negative"
                else:
                    if value > threshold:
                        entry["score"] = 85
                        entry["reasoning"] = f"{factor['above_msg']} — value of {value:,.0f} exceeds threshold of {threshold:,.0f}"
                        entry["direction"] = "positive"
                    else:
                        entry["score"] = 40
                        entry["reasoning"] = f"{factor['below_msg']} — value of {value:,.0f} below threshold of {threshold:,.0f}"
                        entry["direction"] = "negative"
            else:
                entry["score"] = 50
                entry["reasoning"] = f"Data not available for {factor['name']} — neutral score applied"
                entry["direction"] = "neutral"

        entry["weighted_contribution"] = round(entry["score"] * entry["weight_pct"] / 100, 2)
        total_weighted_score += entry["weighted_contribution"]
        reasoning.append(entry)

    # Normalize to 0-100
    final_score = max(0, min(100, round(total_weighted_score)))

    # Determine grade and decision
    if final_score >= 75:
        grade, decision = "Low Risk", "APPROVE"
    elif final_score >= 50:
        grade, decision = "Moderate Risk", "REVIEW"
    else:
        grade, decision = "High Risk", "REJECT"

    # Top contributing factors
    sorted_positive = sorted([r for r in reasoning if r["direction"] == "positive"], key=lambda x: x["weighted_contribution"], reverse=True)
    sorted_negative = sorted([r for r in reasoning if r["direction"] == "negative"], key=lambda x: x["weighted_contribution"])

    top_for = [f["factor_name"] for f in sorted_positive[:3]]
    top_against = [f["factor_name"] for f in sorted_negative[:2]]

    # Legacy drivers format
    drivers = [
        {"factor": r["factor_name"], "weight": r["weight_pct"] / 100, "impact": r["weighted_contribution"], "reason": r["reasoning"]}
        for r in reasoning
    ]

    return {
        "score": final_score,
        "grade": grade,
        "decision": decision,
        "reasoning_breakdown": reasoning,
        "drivers": drivers,
        "verdict": {
            "decision": decision,
            "score": final_score,
            "grade": grade,
            "top_factors_for": top_for,
            "top_factors_against": top_against,
            "summary": f"Decision: {decision} because top contributing factors are {', '.join(top_for)}."
                       + (f" Factors against: {', '.join(top_against)}." if top_against else ""),
        },
        "recommendedLimit": 25000000 if decision == "APPROVE" else (10000000 if decision == "REVIEW" else 0),
        "suggestedInterestRate": "10.50%" if decision == "APPROVE" else ("12.75%" if decision == "REVIEW" else "N/A"),
        "explainability": "12-factor weighted scoring model with per-factor reasoning breakdown.",
    }


@app.post("/triangulate")
def triangulate(req: TriangulateRequest):
    """
    Triangulation Engine — check contradictions and confirmations
    between extracted financials and research findings.
    """
    fin = req.extracted_financials or {}
    research = req.research_findings or {}

    contradictions = []
    confirmations = []

    # 1. Revenue Consistency Check
    revenue = fin.get("revenue", 0) or fin.get("financials", {}).get("revenue", 0) or 0
    gst_revenue = fin.get("gstTurnover", 0) or fin.get("gstAnalysis", {}).get("gstTurnover", 0) or 0
    if revenue > 0 and gst_revenue > 0:
        variance = abs(revenue - gst_revenue) / revenue * 100
        if variance > 15:
            contradictions.append({
                "check": "Revenue Consistency",
                "flag": f"Revenue declared ₹{revenue/10000000:.1f}Cr but GST filings imply ₹{gst_revenue/10000000:.1f}Cr ({variance:.1f}% variance) — possible under-reporting",
                "severity": "high",
            })
        else:
            confirmations.append({
                "check": "Revenue Consistency",
                "message": f"Revenue of ₹{revenue/10000000:.1f}Cr aligns with GST filings ({variance:.1f}% variance)",
            })

    # 2. Debt vs Credit Rating
    dscr = fin.get("dscr", 0) or fin.get("ratios", {}).get("dscr", 0) or 0
    risk_tags = research.get("all_risk_tags", [])
    if "DOWNGRADE" in [t.upper() for t in risk_tags] and dscr and dscr > 1.5:
        contradictions.append({
            "check": "Debt Consistency",
            "flag": f"DSCR appears healthy at {dscr:.1f}x but credit agency downgraded — verify off-balance-sheet obligations",
            "severity": "medium",
        })
    elif dscr and dscr > 1.5:
        confirmations.append({
            "check": "Debt Service",
            "message": f"Strong DSCR of {dscr:.1f}x indicates adequate debt coverage",
        })

    # 3. Litigation vs Financials
    litigation_hits = research.get("litigationHits", [])
    has_litigation = any(h.get("riskLevel") == "high" for h in litigation_hits if isinstance(h, dict))
    net_worth = fin.get("netWorth", 0) or fin.get("financials", {}).get("netWorth", 0) or 0
    if has_litigation and net_worth > 0:
        contradictions.append({
            "check": "Litigation vs Financials",
            "flag": f"Active litigation may materially impact net worth of ₹{net_worth/10000000:.1f}Cr",
            "severity": "high",
        })

    # 4. Promoter Pledge Risk
    pledged = fin.get("pledged_shares_pct", 0)
    if pledged and pledged > 50:
        contradictions.append({
            "check": "Promoter Pledge Risk",
            "flag": f"Promoter has pledged {pledged:.0f}% of shares — forced selling risk if stock declines",
            "severity": "high",
        })

    # 5. Portfolio Stress
    stage3 = fin.get("stage3_pct", 0)
    gnpa = fin.get("gnpa_pct", 0)
    if stage3 and stage3 > 5:
        contradictions.append({
            "check": "Portfolio Stress",
            "flag": f"Portfolio stress indicators elevated: Stage 3 at {stage3:.1f}%",
            "severity": "medium",
        })
    if gnpa and gnpa > 3:
        contradictions.append({
            "check": "GNPA Stress",
            "flag": f"GNPA at {gnpa:.1f}% exceeds comfort threshold of 3%",
            "severity": "medium",
        })

    # 6. Positive Confirmations
    sentiment = research.get("aggregate_sentiment", 0)
    pat = fin.get("pat", 0) or fin.get("financials", {}).get("pat", 0) or 0
    if sentiment and sentiment > 0.3 and pat and pat > 0:
        confirmations.append({
            "check": "Sentiment + Profitability",
            "message": f"Positive market sentiment ({sentiment:.2f}) aligns with profitable operations (PAT: ₹{pat/10000000:.1f}Cr)",
        })

    total_borrowings_growth = fin.get("total_borrowings_growth", 0)
    if dscr and dscr > 2.0 and (not total_borrowings_growth or total_borrowings_growth < 10):
        confirmations.append({
            "check": "Leverage Control",
            "message": f"Strong debt serviceability (DSCR {dscr:.1f}x) with controlled leverage growth",
        })

    # Score: higher = better (fewer contradictions)
    max_score = 100
    deductions = len(contradictions) * 15
    score = max(0, min(100, max_score - deductions + len(confirmations) * 5))

    return {
        "contradictions": contradictions,
        "confirmations": confirmations,
        "overall_triangulation_score": score,
        "summary": f"{len(contradictions)} contradictions, {len(confirmations)} confirmations — score: {score}/100",
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8003)
