# Workflow — Intelli-Credit Analysis Pipeline

## End-to-End Flow

```
Upload → Extract → Research → Score → Generate → Report
```

### Step 1: Document Upload
- User uploads financial document (PDF, DOCX, CSV) via frontend
- Backend validates file (type, size ≤ 20MB), sanitizes filename
- File stored in `/uploads/`, returns `fileId` and `companyId`
- Company record created in MongoDB with GSTIN, PAN, sector

### Step 2: Data Extraction (Extraction Service :8001)
- Backend sends file to extraction service via `POST /extract`
- Service parses document and returns structured JSON:
  - Balance sheet (assets, liabilities, net worth)
  - Key covenants, sanction letters
  - Financial ratios (DSCR, current ratio, D/E)
- Extracted data saved to Financial model in MongoDB

### Step 3: Research Agent (Research Agent :8002)
- Backend calls `POST /search` with company name and GSTIN
- Service returns:
  - **News hits**: recent articles with sentiment scores
  - **Litigation hits**: court cases and risk levels
  - **Regulatory alerts**: MCA compliance, CIBIL score

### Step 4: Risk Scoring (Risk Engine :8003)
- Backend sends extracted data + research findings to `POST /score`
- Engine computes weighted risk score (0–100) based on:
  - Asset strength, GST compliance, DSCR
  - Litigation exposure, news sentiment
  - Sector cyclicality
- Returns: score, grade, drivers with impact values, recommended limit, interest rate

### Step 5: CAM Generation (CAM Generator :8004)
- Backend sends company + risk data to `POST /generate`
- Generator creates DOCX with:
  - Executive Summary, Five Cs Assessment
  - Risk Factor Table, Recommended Terms
- Returns `camUrl` for download and JSON summary

### Step 6: Report Display
- Frontend displays:
  - Risk Score gauge with grade
  - Factor driver breakdown (positive/negative impact)
  - Five Cs cards (Character, Capacity, Capital, Collateral, Conditions)
  - Recommended credit limit (₹) and interest rate
  - Download link for CAM document

## Status State Machine

Analysis progresses through these states (frontend polls every 3s):

```
queued → extracting → researching → scoring → generating → complete
                                                            ↓
                                                          failed
```
