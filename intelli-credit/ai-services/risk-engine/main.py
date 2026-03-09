"""
Risk Engine Service — Deterministic Scoring
Computes Credit Risk Score using transparent formula-based approach.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uvicorn
import logging

from scoring_service import generate_risk_assessment

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Risk Engine", version="2.0.0 (Deterministic)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RiskRequest(BaseModel):
    extractedData: Dict[str, Any]
    researchFindings: Optional[Dict[str, Any]] = {}
    qualitativeAssessment: Optional[Dict[str, Any]] = {}
    manualInputs: Optional[Dict[str, Any]] = {}

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "risk-engine-deterministic",
        "version": "2.0.0"
    }

@app.post("/score")
def score_company(req: RiskRequest):
    """
    Receives all JSON payload attributes and computes a deterministic
    credit risk score based purely on the uploaded data.
    """
    try:
        logger.info("Computing deterministic risk score")
        payload = req.dict()
        result = generate_risk_assessment(payload)
        return result
    except Exception as e:
        logger.error(f"Scoring error: {str(e)}", exc_info=True)
        return {
            "score": 50,
            "pd": 0.50,
            "grade": "BB+",
            "expected_loss": 0,
            "recommendation": "REFER_TO_COMMITTEE",
            "recommendedLimit": 0,
            "suggestedInterestRate": "14.0%",
            "reasons": [{"factor": "System Error", "text": f"Scoring failed: {str(e)}", "impact": "Neutral"}],
            "features_used": {},
        }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8003)
