def classify_news(company_name, note):
    """
    Mock research and classification logic.
    """
    note_lower = note.lower()
    litigation = "lawsuit" in note_lower or "sued" in note_lower
    news_score = 20 if "fraud" in note_lower else 5
    adjustment = -10 if "scandal" in note_lower else 0

    return {
        "litigation_flag": litigation,
        "negative_news_score": news_score,
        "qualitative_adjustment": adjustment
    }
