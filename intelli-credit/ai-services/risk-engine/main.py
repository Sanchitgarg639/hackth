"""
Risk Engine Service — Phase 4 (ML upgraded)
Computes Probability of Default using XGBoost & SHAP.
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

app = FastAPI(title="Risk Engine", version="1.0.0 (ML)")

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
        "service": "risk-engine-ml",
        "version": "1.0.0"
    }

@app.post("/score")
def score_company(req: RiskRequest):
    """
    Receives all JSON payload attributes and pipes into the XGBoost XGBClassifier predictor model.
    """
    logger.info("Computing risk score (XGBoost + SHAP inference)")
    payload = req.dict()
    
    result = generate_risk_assessment(payload)

    return result


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8003)
