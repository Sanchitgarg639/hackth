"""
CAM Generator Service — Phase 4
Generates Word Documents (DOCX) from Risk Analysis results.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uvicorn
import logging
import os
from fastapi.responses import FileResponse

from cam_builder import build_cam_document, OUTPUT_DIR

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CAM Generator", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CAMRequest(BaseModel):
    companyData: Dict[str, Any]
    extractedData: Dict[str, Any]
    researchFindings: Optional[Dict[str, Any]] = {}
    qualitativeAssessment: Optional[Dict[str, Any]] = {}
    riskAnalysis: Dict[str, Any]

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "cam-generator",
        "version": "1.0.0"
    }

@app.post("/generate")
def generate_cam(req: CAMRequest):
    """
    Build the DOCX file and return the filename.
    """
    logger.info("Generating CAM Document")
    
    file_id = build_cam_document(req.dict())
    
    # We return the URL path that the Node.js backend can serve statically or proxy
    return {
        "docxUrl": f"/static/reports/{file_id}",
        "filename": file_id
    }

@app.get("/download/{filename}")
def download_cam(filename: str):
    """
    Allow direct download of the generated DOCX.
    """
    file_path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document', filename=filename)
    return {"error": "File not found"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8004)
