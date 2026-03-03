from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
from scoring.risk_model import calculate_risk

app = FastAPI(title="Risk Engine Service")

class RiskRequest(BaseModel):
    financial_data: dict
    research_data: dict

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "risk-engine"}

@app.post("/score")
def score_company(req: RiskRequest):
    result = calculate_risk(req.financial_data, req.research_data)
    return result

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)
