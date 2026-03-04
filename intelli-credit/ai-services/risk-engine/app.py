from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn

app = FastAPI(title="Risk Engine Service", version="0.1.0")

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
    # Legacy fields
    financial_data: Optional[dict] = {}
    research_data: Optional[dict] = {}

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "risk-engine", "version": "0.1"}

@app.post("/score")
def score_company(req: RiskRequest):
    """
    Credit risk scoring with explainable drivers.
    Phase 1: Returns structured stub with factor breakdown.
    """
    # Use whichever data is provided
    fin = req.extractedData or req.financial_data or {}
    research = req.researchFindings or req.research_data or {}

    # Simulated scoring logic
    base_score = 55
    drivers = []

    # Financial strength factors
    total_assets = fin.get("balanceSheet", {}).get("totalAssets", 0)
    if total_assets > 50000000:
        base_score += 10
        drivers.append({"factor": "Strong asset base (>₹5Cr)", "weight": 0.2, "impact": 10, "reason": "Total assets indicate solid capital structure"})
    else:
        drivers.append({"factor": "Limited asset base", "weight": 0.2, "impact": -5, "reason": "Total assets below threshold"})

    # GST compliance
    gst = fin.get("gstTurnover", fin.get("gst_turnover", 0))
    if gst > 100000000:
        base_score += 8
        drivers.append({"factor": "Strong GST turnover (>₹10Cr)", "weight": 0.15, "impact": 8, "reason": "Consistent GST filings indicate genuine business activity"})

    # DSCR check
    dscr = fin.get("dscr", 0)
    if dscr and dscr > 1.2:
        base_score += 7
        drivers.append({"factor": "Healthy DSCR (>1.2x)", "weight": 0.2, "impact": 7, "reason": "Adequate debt service capacity"})

    # Litigation risk
    litigation = research.get("litigationHits", [])
    if litigation and any(h.get("riskLevel") == "high" for h in litigation if isinstance(h, dict)):
        base_score -= 15
        drivers.append({"factor": "Active litigation exposure", "weight": 0.15, "impact": -15, "reason": "Pending litigation poses credit risk"})
    else:
        base_score += 5
        drivers.append({"factor": "Clean litigation record", "weight": 0.15, "impact": 5, "reason": "No material litigation found"})

    # News sentiment
    news = research.get("newsHits", [])
    positive_news = sum(1 for n in news if isinstance(n, dict) and n.get("sentiment") == "positive")
    if positive_news >= 2:
        base_score += 5
        drivers.append({"factor": "Positive market sentiment", "weight": 0.1, "impact": 5, "reason": f"{positive_news} positive news articles found"})

    # Sector risk
    base_score -= 3
    drivers.append({"factor": "Sector cyclicality adjustment", "weight": 0.1, "impact": -3, "reason": "Standard sector risk deduction"})

    # Cap score
    final_score = max(0, min(100, base_score))

    # Determine grade
    if final_score >= 75:
        grade = "Low Risk"
        decision = "APPROVE"
    elif final_score >= 50:
        grade = "Moderate Risk"
        decision = "REVIEW"
    else:
        grade = "High Risk"
        decision = "REJECT"

    return {
        "score": final_score,
        "grade": grade,
        "decision": decision,
        "drivers": drivers,
        "recommendedLimit": 25000000 if decision == "APPROVE" else (10000000 if decision == "REVIEW" else 0),
        "suggestedInterestRate": "10.50%" if decision == "APPROVE" else ("12.75%" if decision == "REVIEW" else "N/A"),
        "explainability": "Weighted factor model — stub scoring logic. Factors include asset strength, GST compliance, DSCR, litigation, news sentiment, and sector risk.",
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8003)
