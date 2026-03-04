"""
Sentiment Classifier
Uses TextBlob for lightweight, CPU-friendly sentiment analysis.
"""
from textblob import TextBlob

def analyze_sentiment(text: str) -> tuple[float, str]:
    """
    Returns (sentiment_score, sentiment_label)
    - score: float between -1.0 (negative) and 1.0 (positive)
    - label: 'POSITIVE', 'NEUTRAL', 'NEGATIVE', 'CRITICAL'
    """
    if not text:
        return 0.0, "NEUTRAL"
        
    analysis = TextBlob(text)
    score = analysis.sentiment.polarity
    
    if score > 0.3:
        label = "POSITIVE"
    elif score > 0:
        label = "NEUTRAL"
    elif score > -0.3:
        label = "NEGATIVE"
    else:
        label = "CRITICAL"
        
    return score, label
