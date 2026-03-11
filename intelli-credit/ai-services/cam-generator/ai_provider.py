"""
AI Provider — Gemini / Heuristic Stub
Shared module used by extraction-service and cam-generator.

Behaviour:
  GEMINI_API_KEY set   → calls gemini-2.0-flash
  GEMINI_API_KEY blank → returns heuristic stub (app still works)
"""

import os
import json
import logging

logger = logging.getLogger(__name__)

GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "").strip()

_model = None

def _get_model():
    global _model
    if _model is not None:
        return _model
    if not GEMINI_KEY:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_KEY)
        _model = genai.GenerativeModel("gemini-2.0-flash")
        logger.info("Gemini AI provider initialized (gemini-2.0-flash)")
        return _model
    except Exception as e:
        logger.warning(f"Failed to init Gemini: {e} — falling back to stubs")
        return None


def call_ai(prompt: str, expect_json: bool = False) -> str:
    """
    Call Gemini with a prompt. Returns raw string response.
    If GEMINI_KEY is not set, returns empty string.
    """
    model = _get_model()
    if model is None:
        return ""
    try:
        generation_config = {}
        if expect_json:
            generation_config["response_mime_type"] = "application/json"
        response = model.generate_content(prompt, generation_config=generation_config if generation_config else None)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini API call failed: {e}")
        return ""


def call_ai_json(prompt: str) -> dict:
    """
    Call Gemini and parse JSON response. Never raises.
    Returns empty dict on failure or if key is not set.
    """
    raw = call_ai(prompt, expect_json=True)
    if not raw:
        return {}
    # Strip markdown fences if present
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = lines[1:]  # remove opening fence
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.warning(f"Failed to parse Gemini JSON response: {raw[:200]}")
        return {}
