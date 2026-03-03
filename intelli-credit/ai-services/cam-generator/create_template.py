import os
from docx import Document

os.makedirs("templates", exist_ok=True)
doc = Document()
doc.add_heading('Credit Appraisal Memo Template', 0)
doc.save("templates/cam_template.docx")
