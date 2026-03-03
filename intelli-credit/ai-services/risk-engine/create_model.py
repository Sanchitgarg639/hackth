import pickle
import os

model_placeholder = {"model": "xgboost_mock"}

os.makedirs("models", exist_ok=True)
with open("models/risk_model.pkl", "wb") as f:
    pickle.dump(model_placeholder, f)
