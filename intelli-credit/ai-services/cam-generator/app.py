from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
from generator import generate_cam_document
import os
from fastapi.responses import FileResponse

app = FastAPI(title="CAM Generator Service")

class CamRequest(BaseModel):
    company_data: dict
    risk_analysis: dict

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "cam-generator"}

@app.post("/generate")
def generate_cam(req: CamRequest):
    filepath = generate_cam_document(req.company_data, req.risk_analysis)
    return FileResponse(filepath, media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document', filename="cam_report.docx")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8003)
