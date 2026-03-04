# API Contracts — Intelli-Credit (Phase 1)

All routes are versioned under `/api/v1/`. Responses use structured error format: `{error: {code, message}}`.

---

## System Endpoints

### `GET /health`
**Response** `200`:
```json
{ "status": "ok", "uptime": 120, "time": "2024-11-01T12:00:00Z", "version": "1.0.0" }
```

### `GET /metrics`
**Response** `200`:
```json
{ "uptime": 120, "totalRequests": 42, "time": "2024-11-01T12:00:00Z" }
```

### `GET /system/health`
Aggregated health from all AI microservices.

**Response** `200`:
```json
{
  "backend": "ok",
  "extraction": "ok",
  "research": "ok",
  "risk": "ok",
  "cam": "ok"
}
```

---

## Upload

### `POST /api/v1/upload`
**Content-Type**: `multipart/form-data`

| Field | Type | Required |
|-------|------|----------|
| file | File (.pdf, .docx, .csv) | ✅ |
| companyName | string | ✅ |
| sector | string | ❌ |
| gstin | string | ❌ |
| pan | string | ❌ |

**Response** `200`:
```json
{
  "fileId": "1709569123456-sample_annual_report.pdf",
  "filename": "sample-annual-report.pdf",
  "companyId": "65abc123def456789012",
  "extractedData": {
    "balanceSheet": { "totalAssets": 120000000, "totalLiabilities": 80000000, "netWorth": 40000000 },
    "keyCovenants": ["Maintain DSCR > 1.2", "Current ratio > 1.5"],
    "revenue": 150000000,
    "netProfit": 18000000
  },
  "status": "received"
}
```

### `GET /api/v1/upload/:fileId`
**Response** `200`:
```json
{ "fileId": "1709569123456-sample.pdf", "size": 1048576, "uploadedAt": "2024-11-01T12:00:00Z", "status": "stored" }
```

---

## Analysis

### `POST /api/v1/analyze`
**Body**:
```json
{ "fileId": "1709569123456-sample.pdf", "companyId": "65abc123def456789012" }
```

**Response** `202`:
```json
{ "analysisId": "65xyz789abc123456789", "status": "queued", "message": "Analysis started — poll GET /api/v1/analyze/:id for status" }
```

### `GET /api/v1/analyze/:analysisId`
Poll this endpoint every 3 seconds. Status progresses: `queued → extracting → researching → scoring → generating → complete`.

**Response** `200` (in-progress):
```json
{ "analysisId": "65xyz789abc123456789", "status": "researching", "extractedData": {...} }
```

**Response** `200` (complete):
```json
{
  "analysisId": "65xyz789abc123456789",
  "status": "complete",
  "extractedData": { "balanceSheet": {...}, "keyCovenants": [...] },
  "researchFindings": { "newsHits": [...], "litigationHits": [...], "regulatoryAlerts": [...] },
  "riskScore": 72,
  "riskDetails": { "score": 72, "grade": "Moderate Risk", "drivers": [...], "explainability": "..." },
  "camUrl": "/static/CAM_Company.docx",
  "camSummary": { "fiveCs": {...}, "recommendation": "..." }
}
```

---

## Risk

### `GET /api/v1/risk/:companyId`
**Response** `200`:
```json
{
  "companyId": "65abc123def456789012",
  "score": 72,
  "grade": "Moderate Risk",
  "drivers": [
    { "factor": "Strong GST turnover", "impact": 8 },
    { "factor": "Clean litigation record", "impact": 5 },
    { "factor": "Sector cyclicality", "impact": -3 }
  ],
  "recommendedLimit": 25000000,
  "suggestedInterestRate": "11.75%",
  "explainability": "Weighted factor model"
}
```

---

## Report

### `GET /api/v1/report/:analysisId`
**Response** `200`:
```json
{
  "analysisId": "65xyz789abc123456789",
  "companyName": "Tata Steel Ltd",
  "camUrl": "/static/CAM_Tata_Steel_Ltd.docx",
  "summary": {
    "fiveCs": {
      "character": "Stable — clean promoter history",
      "capacity": "Adequate — DSCR 1.85x",
      "capital": "Moderate — net worth ₹4Cr",
      "collateral": "Partial — primary security offered",
      "conditions": "Watchlist — sector under review"
    },
    "recommendation": "PROVISIONAL APPROVAL"
  },
  "riskScore": 72,
  "riskDetails": {...}
}
```

**Response** `409` (analysis incomplete):
```json
{ "error": { "code": "ANALYSIS_INCOMPLETE", "message": "Analysis is still scoring. Wait for completion." } }
```

---

## AI Service Endpoints (Internal)

| Service | Port | Health | Endpoint |
|---------|------|--------|----------|
| Extraction | 8001 | `GET /health` | `POST /extract` |
| Research | 8002 | `GET /health` | `POST /search` |
| Risk Engine | 8003 | `GET /health` | `POST /score` |
| CAM Generator | 8004 | `GET /health` | `POST /generate` |

All health endpoints return: `{"status": "ok", "service": "<name>", "version": "0.1"}`
