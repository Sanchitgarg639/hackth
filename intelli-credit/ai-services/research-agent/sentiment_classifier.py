"""
Sentiment Classifier
Uses TextBlob for lightweight, CPU-friendly sentiment analysis.
"""
from transformers import pipeline

# Initialize FinBERT pipeline
# Explicitly use ProsusAI/finbert for financial text
sentiment_pipeline = pipeline("sentiment-analysis", model="ProsusAI/finbert")

def analyze_sentiment(text: str) -> tuple[float, str]:
    """
    Returns (sentiment_score, sentiment_label)
    - score: float between -1.0 (negative) and 1.0 (positive)
    - label: 'POSITIVE', 'NEUTRAL', 'NEGATIVE', 'CRITICAL'
    """
    if not text:
        return 0.0, "NEUTRAL"
        
    # Truncate text to avoid BERT max token length limits
    safe_text = text[:512]
    
    try:
        result = sentiment_pipeline(safe_text)[0]
        label_raw = result['label']
        score_raw = result['score'] # Confidence of the label
        
        # Map FinBERT labels back to our -1.0 to 1.0 scale
        if label_raw == "positive":
            score = score_raw
            label = "POSITIVE"
        elif label_raw == "negative":
            # Very high confidence negative is CRITICAL
            if score_raw > 0.8:
                score = -score_raw
                label = "CRITICAL"
            else:
                score = -score_raw
                label = "NEGATIVE"
        else: # "neutral"
            score = 0.0
            label = "NEUTRAL"
            
    except Exception as e:
        # Fallback if pipeline fails
        return 0.0, "NEUTRAL"
        
    return score, label
