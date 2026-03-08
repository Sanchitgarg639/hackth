"""
Dummy Model Training Script for Phase 4 PD Model.
Generates an artificial credit dataset, trains an XGBoost classifier,
creates a SHAP explainer, and saves them to .pkl files.
"""
import os
import joblib
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
import shap
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure we're saving to the actual `ml` directory where this script resides
base_dir = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(base_dir, "model.pkl")
EXPLAINER_PATH = os.path.join(base_dir, "shap_explainer.pkl")

def create_synthetic_data(n_samples=5000):
    """
    Generate synthetic data that makes intuitive credit sense.
    Defaults are more common in high D/E, low DSCR, high variance, low sentiment.
    """
    np.random.seed(42)
    
    # Generate somewhat realistic financial features
    de_ratio = np.random.lognormal(mean=0.5, sigma=0.8, size=n_samples) # Ranges mostly 0-5
    dscr = np.random.normal(loc=1.5, scale=0.8, size=n_samples)
    dscr = np.clip(dscr, 0, 10)
    pat_margin = np.random.normal(loc=0.08, scale=0.1, size=n_samples)
    gst_variance = np.random.exponential(scale=0.05, size=n_samples)
    itc_mismatch = np.random.exponential(scale=0.02, size=n_samples)
    
    # NLP and qualitative
    avg_sentiment = np.random.normal(loc=0.1, scale=0.5, size=n_samples)
    avg_sentiment = np.clip(avg_sentiment, -1, 1)
    critical_news = np.random.poisson(lam=0.5, size=n_samples)
    fraud_flag = np.random.binomial(n=1, p=0.05, size=n_samples)
    litigation_flag = np.random.binomial(n=1, p=0.15, size=n_samples)
    
    site_rating = np.random.choice([1, 2, 3, 4, 5], p=[0.05, 0.1, 0.4, 0.3, 0.15], size=n_samples)
    mgmt_rating = np.random.choice([1, 2, 3, 4, 5], p=[0.05, 0.1, 0.4, 0.3, 0.15], size=n_samples)
    collateral_coverage = np.random.normal(loc=1.2, scale=0.5, size=n_samples)
    collateral_coverage = np.clip(collateral_coverage, 0, 5)

    df = pd.DataFrame({
        "de_ratio": de_ratio,
        "dscr": dscr,
        "pat_margin": pat_margin,
        "gst_variance": gst_variance,
        "itc_mismatch": itc_mismatch,
        "avg_sentiment": avg_sentiment,
        "critical_news": critical_news,
        "fraud_flag": fraud_flag,
        "litigation_flag": litigation_flag,
        "site_rating": site_rating,
        "mgmt_rating": mgmt_rating,
        "collateral_coverage": collateral_coverage
    })

    # Synthetic target logic (probability of default)
    # Higher risk components increase the exponent
    risk_score = (
        (de_ratio * 0.5) +
        (np.where(dscr < 1.0, 1.5, 0)) -
        (dscr * 0.2) -
        (pat_margin * 2.0) +
        (gst_variance * 5.0) +
        (itc_mismatch * 8.0) -
        (avg_sentiment * 1.5) +
        (critical_news * 0.8) +
        (fraud_flag * 3.0) +
        (litigation_flag * 1.0) -
        (site_rating * 0.3) -
        (mgmt_rating * 0.4) -
        (collateral_coverage * 0.5)
    )
    
    # Convert arbitrary scale to prob
    # Logistic function
    prob = 1 / (1 + np.exp(-(risk_score - 1.0)))
    
    # Deterministic generation instead of random binomial
    # y = np.random.binomial(1, prob)
    y = np.where(prob > 0.45, 1, 0)
    df['default'] = y
    
    return df


def train():
    logger.info("Generating internal synthetic dataset (5000 rows)...")
    df = create_synthetic_data(5000)
    
    X = df.drop('default', axis=1)
    y = df['default']
    
    logger.info(f"Training XGBoost Classifier on {len(df)} samples... Global default rate: {y.mean():.1%}")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = XGBClassifier(
        n_estimators=300,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric='logloss',
        random_state=42
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    train_pd = model.predict_proba(X_train)[:, 1]
    test_pd = model.predict_proba(X_test)[:, 1]
    logger.info(f"Model fitted successfully. Test set avg PD: {test_pd.mean():.1%}")
    
    # Generate SHAP explainer
    logger.info("Building SHAP TreeExplainer...")
    explainer = shap.TreeExplainer(model)
    
    # Save artifacts
    logger.info(f"Saving artifacts to {base_dir}")
    joblib.dump(model, MODEL_PATH)
    joblib.dump(explainer, EXPLAINER_PATH)
    
    logger.info("Training complete. model.pkl and shap_explainer.pkl generated successfully.")

def test_inference():
    """
    Load the trained model and run an actual deterministic prediction
    to generate the real result in this file.
    """
    logger.info("--- Running Actual ML Inference ---")
    model = joblib.load(MODEL_PATH)
    explainer = joblib.load(EXPLAINER_PATH)
    
    # Real deterministic features matching the pipeline
    demo_features = pd.DataFrame([{
        "de_ratio": 1.25,
        "dscr": 2.50,
        "pat_margin": 0.12,
        "gst_variance": 0.0,
        "itc_mismatch": 0.0,
        "avg_sentiment": 0.8,
        "critical_news": 0,
        "fraud_flag": 0,
        "litigation_flag": 0,
        "site_rating": 4,
        "mgmt_rating": 4,
        "collateral_coverage": 1.5
    }])
    
    prediction = model.predict(demo_features)[0]
    prob = model.predict_proba(demo_features)[0][1]
    
    logger.info(f"Input Features:\\n{demo_features.to_string(index=False)}")
    logger.info(f"Actual Model Prediction (Default = 1, Safe = 0): {prediction}")
    logger.info(f"Actual Probability of Default (PD): {prob:.2%}")
    
    shap_values = explainer(demo_features)
    logger.info(f"Top drivers (SHAP Base values): {shap_values.values[0][:3]}")
    logger.info("--- Inference Complete ---")

if __name__ == "__main__":
    train()
    test_inference()
