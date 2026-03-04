import os
import csv
import json
from reportlab.pdfgen import canvas

# Ensure directories exist
os.makedirs('frontend/public/demo-data', exist_ok=True)

# 1. Generate Sample Annual Report PDF
pdf_path = 'frontend/public/demo-data/sample_annual_report.pdf'
c = canvas.Canvas(pdf_path)
c.setFont("Helvetica-Bold", 16)
c.drawString(100, 800, "ANNUAL REPORT 2023 - RELIANCE INDUSTRIES")
c.setFont("Helvetica", 12)
c.drawString(100, 770, "Consolidated Financial Performance (in INR)")
c.drawString(100, 740, "Revenue: 50,000,000")
c.drawString(100, 720, "PAT: 12,000,000")
c.drawString(100, 700, "EBITDA: 18,000,000")
c.drawString(100, 680, "Total Debt: 20,000,000")
c.drawString(100, 660, "Net Worth: 60,000,000")
c.drawString(100, 640, "Total Assets: 80,000,000")
c.drawString(100, 620, "Current Assets: 30,000,000")
c.drawString(100, 600, "Current Liabilities: 25,000,000")

c.setFont("Helvetica-Oblique", 10)
c.drawString(100, 560, "Auditor's Note: The company operates as a going concern.")
c.drawString(100, 545, "No litigation involving wilful defaulter tags was found.")
c.save()
print(f"Created {pdf_path}")

# 2. Generate Sample GST CSV
csv_path = 'frontend/public/demo-data/sample_gst.csv'
with open(csv_path, 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['Month', 'GSTR-3B Turnover', 'GSTR-2A ITC', 'GSTR-3B ITC Claimed'])
    writer.writerow(['April', '4000000', '200000', '236000']) # 18% ITC mismatch
    writer.writerow(['May', '4200000', '210000', '215000'])
    writer.writerow(['June', '3900000', '195000', '198000'])
print(f"Created {csv_path}")

# 3. Generate Mock Research JSON
json_path = 'frontend/public/demo-data/mock_research.json'
mock_research = [
    {"title": "Reliance Industries posts strong Q3 profit amidst global challenges", "source": "Economic Times", "sentiment": 0.8, "tags": ["POSITIVE", "FINANCIALS"]},
    {"title": "Reliance expands rapid consumer retail footprint into Tier 2 cities", "source": "Reuters", "sentiment": 0.9, "tags": ["POSITIVE", "EXPANSION"]},
    {"title": "Regulatory scrutiny deepens over Reliance acquisition structure", "source": "Business Standard", "sentiment": -0.4, "tags": ["REGULATORY", "NEGATIVE"]},
    {"title": "Ongoing environmental litigation regarding Jamnagar expansion", "source": "LiveLaw", "sentiment": -0.7, "tags": ["LITIGATION", "CRITICAL"]}
]
with open(json_path, 'w') as f:
    json.dump(mock_research, f, indent=4)
print(f"Created {json_path}")
