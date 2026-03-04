from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn

app = FastAPI(title="Research Agent Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SearchRequest(BaseModel):
    companyName: str
    gstin: Optional[str] = ""

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "research-agent", "version": "0.1"}

@app.post("/search")
def search_company(req: SearchRequest):
    """
    Secondary research: news, litigation, regulatory alerts.
    Phase 1: Returns rich stub data.
    """
    return {
        "newsHits": [
            {
                "title": f"{req.companyName} posts strong Q3 results",
                "source": "Economic Times",
                "date": "2024-10-15",
                "sentiment": "positive",
                "relevance": 0.92,
            },
            {
                "title": f"Sector outlook upgraded for {req.companyName}'s industry",
                "source": "Mint",
                "date": "2024-09-28",
                "sentiment": "positive",
                "relevance": 0.78,
            },
            {
                "title": "RBI flags concerns about unsecured lending growth",
                "source": "Business Standard",
                "date": "2024-11-02",
                "sentiment": "negative",
                "relevance": 0.45,
            },
        ],
        "litigationHits": [
            {
                "case": "No active litigation found",
                "court": "N/A",
                "status": "clean",
                "riskLevel": "low",
            }
        ],
        "regulatoryAlerts": [
            {
                "source": "MCA",
                "type": "Annual filing compliance",
                "status": "compliant",
                "lastChecked": "2024-11-01",
            },
            {
                "source": "CIBIL",
                "type": "Commercial credit check",
                "score": 750,
                "status": "good standing",
                "lastChecked": "2024-10-20",
            },
        ],
    }

# Keep legacy endpoint for backward compatibility
@app.post("/research")
def research_company_legacy(req: SearchRequest):
    """Legacy endpoint — redirects to /search"""
    return search_company(req)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)
