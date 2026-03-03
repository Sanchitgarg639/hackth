from fastapi import FastAPI, UploadFile, File
import uvicorn
from extractors.pdf_extractor import extract_financials

app = FastAPI(title="Extraction Service")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "extraction-service"}

@app.post("/extract")
async def extract_data(file: UploadFile = File(...)):
    # Read file content and pass to extractor
    content = await file.read()
    # Mock extraction result
    result = extract_financials(content)
    return result

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
