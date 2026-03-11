from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import asyncio

app = FastAPI(title="Research Agent Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SearchRequest(BaseModel):
    companyName: str
    sector: Optional[str] = ""
    gstin: Optional[str] = ""

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "research-agent", "version": "2.0.0"}


async def _company_research(company_name: str, sector: str) -> dict:
    """Track 1 — Company Research"""
    await asyncio.sleep(0.1)  # Simulate async work
    return {
        "track_name": "Company Research",
        "findings": [
            {"title": f"{company_name} posts strong Q3 results", "source": "Economic Times", "date": "2025-01-15", "sentiment": "positive", "relevance": 0.92},
            {"title": f"Sector outlook upgraded for {company_name}'s industry", "source": "Mint", "date": "2025-01-08", "sentiment": "positive", "relevance": 0.78},
            {"title": f"{company_name} credit rating reaffirmed at AA by CRISIL", "source": "CRISIL", "date": "2025-02-01", "sentiment": "positive", "relevance": 0.95},
        ],
        "sentiment_score": 0.72,
        "risk_tags": [],
        "key_alerts": [],
        "source_urls": ["https://economictimes.com", "https://livemint.com", "https://crisil.com"],
    }


async def _sector_research(sector: str) -> dict:
    """Track 2 — Sector Research"""
    await asyncio.sleep(0.1)
    sector_name = sector or "General"
    return {
        "track_name": "Sector Research",
        "findings": [
            {"title": f"{sector_name} India credit outlook stable for 2025", "source": "RBI Report", "date": "2025-01-20", "sentiment": "neutral", "relevance": 0.85},
            {"title": f"{sector_name} NPA trends show improvement in Q3 FY25", "source": "Business Standard", "date": "2025-02-05", "sentiment": "positive", "relevance": 0.80},
            {"title": f"RBI issues new guidelines for {sector_name} sector lending", "source": "RBI Circular", "date": "2025-01-30", "sentiment": "neutral", "relevance": 0.70},
        ],
        "sentiment_score": 0.45,
        "risk_tags": ["REGULATORY"],
        "key_alerts": [f"New RBI guidelines may impact {sector_name} lending norms"],
        "source_urls": ["https://rbi.org.in", "https://business-standard.com"],
    }


async def _legal_research(company_name: str) -> dict:
    """Track 3 — Legal Research"""
    await asyncio.sleep(0.1)
    return {
        "track_name": "Legal Research",
        "findings": [
            {"title": f"No active NCLT cases found for {company_name}", "source": "NCLT Database", "date": "2025-02-10", "sentiment": "positive", "relevance": 0.90},
            {"title": f"{company_name} ROC filings up to date", "source": "MCA Portal", "date": "2025-01-25", "sentiment": "positive", "relevance": 0.85},
        ],
        "sentiment_score": 0.80,
        "risk_tags": [],
        "key_alerts": [],
        "source_urls": ["https://nclt.gov.in", "https://mca.gov.in"],
    }


async def _market_sentiment(company_name: str) -> dict:
    """Track 4 — Market Sentiment"""
    await asyncio.sleep(0.1)
    return {
        "track_name": "Market Sentiment",
        "findings": [
            {"title": f"Analysts upgrade {company_name} target price by 15%", "source": "Bloomberg", "date": "2025-02-08", "sentiment": "positive", "relevance": 0.88},
            {"title": f"{company_name} ESG rating improved to A from BBB", "source": "MSCI ESG", "date": "2025-01-15", "sentiment": "positive", "relevance": 0.75},
        ],
        "sentiment_score": 0.65,
        "risk_tags": [],
        "key_alerts": ["ESG rating improved — positive for institutional investors"],
        "source_urls": ["https://bloomberg.com", "https://msci.com"],
    }


@app.post("/search")
async def search_company(req: SearchRequest):
    """
    Secondary research: runs 4 parallel research tracks.
    """
    # Run all 4 tracks in parallel
    results = await asyncio.gather(
        _company_research(req.companyName, req.sector or ""),
        _sector_research(req.sector or "General"),
        _legal_research(req.companyName),
        _market_sentiment(req.companyName),
    )

    tracks = {r["track_name"]: r for r in results}

    # Compute aggregate sentiment
    avg_sentiment = sum(r["sentiment_score"] for r in results) / len(results) if results else 0
    all_risk_tags = []
    all_alerts = []
    for r in results:
        all_risk_tags.extend(r.get("risk_tags", []))
        all_alerts.extend(r.get("key_alerts", []))

    # Also return legacy format for backward compatibility
    return {
        "tracks": tracks,
        "aggregate_sentiment": round(avg_sentiment, 2),
        "all_risk_tags": list(set(all_risk_tags)),
        "all_key_alerts": all_alerts,
        # Legacy fields
        "newsHits": tracks.get("Company Research", {}).get("findings", []),
        "litigationHits": [
            {"case": f.get("title", ""), "court": f.get("source", ""), "status": "clean", "riskLevel": "low"}
            for f in tracks.get("Legal Research", {}).get("findings", [])
        ],
        "regulatoryAlerts": [
            {"source": "MCA", "type": "Annual filing compliance", "status": "compliant", "lastChecked": "2025-02-01"},
            {"source": "CIBIL", "type": "Commercial credit check", "score": 750, "status": "good standing", "lastChecked": "2025-01-20"},
        ],
    }


# Keep legacy endpoint for backward compatibility
@app.post("/research")
async def research_company_legacy(req: SearchRequest):
    """Legacy endpoint — redirects to /search"""
    return await search_company(req)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)
