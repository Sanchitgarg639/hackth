import os
import joblib
import pandas as pd
import logging
from ml.feature_pipeline import build_feature_vector
from ml.explainability import generate_explanations
from grade_mapper import map_pd_to_grade, generate_decision, calculate_expected_loss

logger = logging.getLogger(__name__)

# Load ML artifacts statically once on boot
base_dir = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(base_dir, "ml/model.pkl")
EXPLAINER_PATH = os.path.join(base_dir, "ml/shap_explainer.pkl")

# We expect train_model.py to have been fired during Docker build, bringing these alive.
try:
    xgb_model = joblib.load(MODEL_PATH)
    shap_explainer = joblib.load(EXPLAINER_PATH)
    logger.info("ML Assets dynamically loaded for Risk Engine!")
except Exception as e:
    logger.error(f"Failed to load ML artifacts. Was train_model.py run? Error: {e}")
    xgb_model = None
    shap_explainer = None


def generate_risk_assessment(payload: dict) -> dict:
    """
    Main orchestration function for scoring:
    1. Extracts pure flat vectors out of the nested JSON.
    2. Runs model prediction to get Probability of Default (PD).
    3. Runs SHAP explanation to convert numbers into human insight logs.
    4. Computes mapping (Ratings + Expected Loss + Limit checks).
    """

    if xgb_model is None or shap_explainer is None:
        logger.warning("Failing back to dummy scores due to missing ML assets.")
        return _dummy_fallback()

    # 1. Feature Prep
    features_df = build_feature_vector(payload)
    
    # 2. Predict PD 
    # predict_proba returns [prob_class_0, prob_class_1] where 1 is Default.
    pd_prob = float(xgb_model.predict_proba(features_df)[0][1])

    # 3. Explain via SHAP
    reasons = generate_explanations(shap_explainer, xgb_model, features_df)

    # 4. Map Grade and Metrics
    grade = map_pd_to_grade(pd_prob)
    recommendation, proposed_rate = generate_decision(pd_prob, grade)
    
    # Financial data
    requested_limit = payload.get('manualInputs', {}).get('requestedLimit', 10_000_000)
    expected_loss = calculate_expected_loss(pd_prob, 0.45, requested_limit)

    # Convert pd back to a /100 score for frontend compatibility, inverted (High Score = Good)
    score_out_of_100 = int(round((1.0 - pd_prob) * 100))

    return {
        "score": score_out_of_100,    # E.g. 92
        "pd": round(pd_prob, 4),      # E.g. 0.0812
        "grade": grade,               # E.g. "BBB"
        "expected_loss": round(expected_loss, 2),
        "recommendation": recommendation,
        "recommendedLimit": requested_limit,
        "suggestedInterestRate": proposed_rate,
        "reasons": reasons,
        "features_used": features_df.to_dict(orient="records")[0]
    }

def _dummy_fallback():
    return {
        "score": 68,
        "pd": 0.32,
        "grade": "BB+",
        "expected_loss": 500000,
        "recommendation": "APPROVE_WITH_CONDITIONS",
        "recommendedLimit": 45000000,
        "suggestedInterestRate": "12.5%",
        "reasons": [{"factor": "Risk Driver", "text": "ML Model failed to load, falling back to dummy", "impact": "Neutral"}],
        "features_used": {}
    }
