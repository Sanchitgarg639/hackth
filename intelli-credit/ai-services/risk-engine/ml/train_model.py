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
    # D/E: wider spread — bad companies can have very high leverage (>4x)
    de_ratio = np.random.lognormal(mean=0.7, sigma=1.0, size=n_samples)
    de_ratio = np.clip(de_ratio, 0, 10)

    # DSCR: bad companies cluster below 1.0 (can't service debt)
    dscr = np.random.normal(loc=1.3, scale=1.0, size=n_samples)
    dscr = np.clip(dscr, 0, 10)

    # PAT margin: realistic spread including genuinely loss-making companies
    pat_margin = np.random.normal(loc=0.03, scale=0.18, size=n_samples)
    pat_margin = np.clip(pat_margin, -0.5, 0.5)

    # GST & ITC: wider variance — fraud companies can have >30% variance
    gst_variance = np.random.exponential(scale=0.10, size=n_samples)
    itc_mismatch = np.random.exponential(scale=0.06, size=n_samples)

    # NLP and qualitative
    avg_sentiment = np.random.normal(loc=0.0, scale=0.6, size=n_samples)
    avg_sentiment = np.clip(avg_sentiment, -1, 1)
    critical_news = np.random.poisson(lam=1.0, size=n_samples)
    # Higher base rates for fraud/litigation in realistic MSME population
    fraud_flag = np.random.binomial(n=1, p=0.10, size=n_samples)
    litigation_flag = np.random.binomial(n=1, p=0.20, size=n_samples)

    site_rating = np.random.choice([1, 2, 3, 4, 5], p=[0.10, 0.20, 0.35, 0.25, 0.10], size=n_samples)
    mgmt_rating = np.random.choice([1, 2, 3, 4, 5], p=[0.10, 0.20, 0.35, 0.25, 0.10], size=n_samples)
    collateral_coverage = np.random.normal(loc=0.9, scale=0.6, size=n_samples)
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

    # Synthetic target logic (Probability of Default)
    # CRITICAL: Weights must be strong enough to differentiate bad from good companies.
    # Each term's realistic expected contribution is documented below.
    risk_score = (
        (de_ratio * 0.6)                        # High leverage directly raises default risk
        + (np.where(dscr < 1.0, 3.0, 0))        # Strong penalty: sub-1.0 DSCR = can't pay interest
        - (dscr * 0.5)                           # Higher DSCR = better debt serviceability
        - (pat_margin * 4.0)                     # Negative PAT margin = burning cash = big risk
        + (gst_variance * 8.0)                   # High GST variance = revenue inflation fraud signal
        + (itc_mismatch * 10.0)                  # ITC mismatch = tax fraud indicator
        - (avg_sentiment * 2.0)                  # Negative news sentiment = reputational risk
        + (critical_news * 1.5)                  # Each critical news article materially raises risk
        + (fraud_flag * 5.0)                     # Fraud tags are hard red flags
        + (litigation_flag * 2.5)                # Active litigation is a significant risk signal
        - (site_rating * 0.4)                    # Good site visit reduces risk
        - (mgmt_rating * 0.5)                    # Good management reduces risk
        - (collateral_coverage * 0.8)            # Adequate collateral is a strong mitigant
    )
    # Convert arbitrary scale to probability via logistic function.
    # Centered at 0.0 (not -1.0) so the average company lands at ~50% default prob,
    # which then differentiates well across the ful good-to-bad spectrum.
    prob = 1 / (1 + np.exp(-risk_score))

    # Binomial toss based on prob
    y = np.random.binomial(1, prob)
    df['default'] = y

    default_rate = y.mean()
    logger.info(f"Synthetic dataset default rate: {default_rate:.1%} (target: 30-50% for a balanced model)")
    return df


def train():
    logger.info("Generating internal synthetic dataset (5000 rows)...")
    df = create_synthetic_data(5000)
    
    X = df.drop('default', axis=1)
    y = df['default']
    
    logger.info(f"Training XGBoost Classifier on {len(df)} samples... Global default rate: {y.mean():.1%}")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Compute class weight ratio to handle any residual imbalance in synthetic data
    n_default = int(y.sum())
    n_safe = len(y) - n_default
    scale_pos_weight = n_safe / max(n_default, 1)
    logger.info(f"Class balance: {n_safe} safe / {n_default} default → scale_pos_weight={scale_pos_weight:.2f}")

    model = XGBClassifier(
        n_estimators=400,
        max_depth=5,
        learning_rate=0.04,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,  # Corrects for class imbalance bias
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
