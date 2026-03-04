"""
Research Agent — Phase 3 (Digital Credit Manager)
Fetches public news, evaluates sentiment, and tags risks.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import logging

from web_crawler import fetch_news
from sentiment_classifier import analyze_sentiment
from keyword_classifier import detect_keywords

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Research Agent", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ResearchRequest(BaseModel):
    companyName: str
    sector: str = ""
    gstin: str = ""

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "research-agent",
        "version": "0.3"
    }

@app.post("/research")
def run_research(req: ResearchRequest):
    """
    Run an automated research report over public sources.
    Currently uses Google News RSS as the primary data source,
    with Extracted Sentiment and Keyword Tags.
    """
    logger.info(f"Starting research for {req.companyName}")
    
    # 1. Scrape latest relevant news
    news_items = fetch_news(req.companyName)
    
    results = []
    
    # 2. Process each finding
    for item in news_items:
        # Calculate sentiment
        score, label = analyze_sentiment(item.get("title", ""))
        
        # Detect risk tags from both title and snippet
        text_context = f"{item.get('title', '')} {item.get('snippet', '')}"
        tags = detect_keywords(text_context)
        
        # We only keep items that are either negative/critical OR have risk tags,
        # unless we don't have enough results, then we keep everything.
        is_risk_relevant = (score < 0 or len(tags) > 0)
        
        if is_risk_relevant or len(results) < 5:
            finding = {
                "title": item.get("title", ""),
                "source": item.get("source", "Web"),
                "url": item.get("url", ""),
                "published_date": item.get("published_date", ""),
                "sentiment_score": round(score, 2),
                "sentiment_label": label,
                "risk_tags": tags,
                "snippet": item.get("snippet", "")
            }
            results.append(finding)
            
    # Calculate aggregates for the return payload so Risk Engine can ingest easily
    critical_count = sum(1 for r in results if r["sentiment_label"] == "CRITICAL")
    negative_count = sum(1 for r in results if r["sentiment_label"] == "NEGATIVE")
    
    all_tags = []
    for r in results:
        all_tags.extend(r["risk_tags"])
    unique_tags = list(set(all_tags))
    
    avg_score = 0
    if results:
        avg_score = round(sum(r["sentiment_score"] for r in results) / len(results), 2)
        
    logger.info(f"Research complete. Found {len(results)} items. Avg sentiment: {avg_score}")

    return {
        "findings": results,
        "summary": {
            "total_items": len(results),
            "critical_count": critical_count,
            "negative_count": negative_count,
            "avg_sentiment": avg_score,
            "unique_risk_tags": unique_tags
        }
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)
