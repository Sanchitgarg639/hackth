from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
from classifiers.keyword_classifier import classify_news

app = FastAPI(title="Research Agent Service")

class ResearchRequest(BaseModel):
    company_name: str
    qualitative_note: str

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "research-agent"}

@app.post("/research")
def research_company(req: ResearchRequest):
    result = classify_news(req.company_name, req.qualitative_note)
    return result

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
