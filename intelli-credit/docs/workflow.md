# Workflow

1. User uploads PDFs via frontend
2. Frontend calls backend
3. Backend stores files locally
4. Backend sends file path to extraction service
5. Extraction returns structured data
6. Backend stores data in MongoDB
7. Backend calls research-agent
8. Backend calls risk-engine
9. Backend stores risk result
10. Backend calls cam-generator
11. Backend returns risk dashboard + report link
