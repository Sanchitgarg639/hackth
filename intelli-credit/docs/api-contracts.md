# API Contracts

## 1. POST /api/upload (Backend)
**Internal Flow**: Backend stores PDF, calls `POST http://extraction-service:8000/extract`

## 2. Extraction Service (POST http://extraction-service:8000/extract)
**Input**: Multipart Form Data (PDF)
**Output JSON**:
```json
{
  "revenue": 1000000,
  "net_profit": 200000,
  "liabilities": 50000,
  "gst_turnover": 1050000
}
```

## 3. Research Service (POST http://research-agent:8001/research)
**Input JSON**:
```json
{
  "company_name": "Acme Corp",
  "qualitative_note": "Great quarterly earnings."
}
```
**Output JSON**:
```json
{
  "litigation_flag": false,
  "negative_news_score": 10,
  "qualitative_adjustment": 5
}
```

## 4. Risk Engine (POST http://risk-engine:8002/score)
**Input JSON**:
```json
{
  "financial_data": {},
  "research_data": {}
}
```
**Output JSON**:
```json
{
  "final_score": 85,
  "breakdown": {
    "financial_score": 50,
    "litigation_score": 25,
    "sector_score": 10
  },
  "decision": "APPROVE",
  "recommended_limit": 500000,
  "interest_rate": 8.5
}
```

## 5. CAM Generator (POST http://cam-generator:8003/generate)
**Input JSON**:
```json
{
  "company_data": {},
  "risk_analysis": {}
}
```
**Output**: `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (file stream)
