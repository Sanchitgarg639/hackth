"""
Deterministic Credit Risk Scoring Service (v2 — Zero Bias).
Each financial metric is scored on a 0-100 sub-scale using standard
credit risk thresholds. Missing features are EXCLUDED and their weight
is redistributed proportionally to the features that have actual data.
This ensures the final score is driven ONLY by real data, with no
pull toward any midpoint.
"""
import logging
from ml.feature_pipeline import build_feature_vector
from grade_mapper import map_score_to_grade, generate_decision, calculate_expected_loss

logger = logging.getLogger(__name__)


# ── Sub-score functions ──
# Each returns a value in [0, 100] where 100 = best credit quality

def _linear_score(value, best, worst):
    """Linear interpolation: best → 100, worst → 0, clamped to [0,100]."""
    if best == worst:
        return 50.0
    score = (value - worst) / (best - worst) * 100.0
    return max(0.0, min(100.0, score))


def _score_de_ratio(val):
    """Debt/Equity: lower is better. ≤0.3 → 100, ≥6.0 → 0."""
    return _linear_score(val, best=0.3, worst=6.0)


def _score_dscr(val):
    """DSCR: higher is better. ≥4.0 → 100, ≤0.3 → 0."""
    return _linear_score(val, best=4.0, worst=0.3)


def _score_pat_margin(val):
    """PAT Margin: higher is better. ≥0.25 → 100, ≤-0.20 → 0."""
    return _linear_score(val, best=0.25, worst=-0.20)


def _score_gst_variance(val):
    """GST Variance %: lower is better. 0% → 100, ≥40% → 0."""
    return _linear_score(val, best=0.0, worst=40.0)


def _score_itc_mismatch(val):
    """ITC Mismatch %: lower is better. 0% → 100, ≥25% → 0."""
    return _linear_score(val, best=0.0, worst=25.0)


def _score_sentiment(val):
    """Average sentiment: +1 → 100, -1 → 0."""
    return _linear_score(val, best=1.0, worst=-1.0)


def _score_critical_news(val):
    """Critical news count: 0 → 100, ≥6 → 0."""
    return _linear_score(val, best=0, worst=6)


def _score_binary_flag(val):
    """Binary flag (fraud/litigation): absent → 100, present → 0."""
    return 0.0 if val >= 1.0 else 100.0


def _score_rating(val):
    """1-5 rating: 5 → 100, 1 → 0."""
    return _linear_score(val, best=5, worst=1)


def _score_collateral(val):
    """Collateral coverage: ≥2.5x → 100, 0x → 0."""
    return _linear_score(val, best=2.5, worst=0.0)


# ── Weight configuration ──
# Base weights define RELATIVE importance. They don't need to sum to 1.0
# because we normalize dynamically based on which features are present.
SCORING_FACTORS = [
    # (key, display_name, base_weight, scoring_fn)
    ("de_ratio",             "Debt-to-Equity Ratio",          15, _score_de_ratio),
    ("dscr",                 "Debt Service Coverage (DSCR)",   15, _score_dscr),
    ("pat_margin",           "Net Profit (PAT) Margin",        12, _score_pat_margin),
    ("gst_variance",         "GST Turnover Variance",          10, _score_gst_variance),
    ("itc_mismatch",         "Input Tax Credit Mismatch",       8, _score_itc_mismatch),
    ("avg_sentiment",        "News Sentiment Score",             8, _score_sentiment),
    ("critical_news",        "Critical News Articles",           7, _score_critical_news),
    ("fraud_flag",           "Fraud Risk Indicators",            7, _score_binary_flag),
    ("litigation_flag",      "Litigation Risk Indicators",       5, _score_binary_flag),
    ("site_rating",          "Site Visit Rating",                5, _score_rating),
    ("mgmt_rating",          "Management Quality Rating",        5, _score_rating),
    ("collateral_coverage",  "Collateral Coverage Ratio",        3, _score_collateral),
]


def _format_feature_value(key, val):
    """Format raw feature value for human-readable display."""
    if val is None:
        return "Not provided"
    if key in ("de_ratio", "dscr", "collateral_coverage"):
        return f"{val:.2f}x"
    if key == "pat_margin":
        return f"{val * 100:.1f}%"
    if key in ("gst_variance", "itc_mismatch"):
        return f"{val:.1f}%"
    if key == "avg_sentiment":
        return f"{val:+.2f}"
    if key == "critical_news":
        return f"{int(val)} article(s)"
    if key in ("fraud_flag", "litigation_flag"):
        return "Present" if val >= 1.0 else "Absent"
    if key in ("site_rating", "mgmt_rating"):
        return f"{int(val)}/5"
    return f"{val}"


def generate_risk_assessment(payload: dict) -> dict:
    """
    Deterministic risk scoring (Zero Bias):
    1. Extract features from the uploaded data payload.
    2. Score ONLY features that have actual data (not None).
    3. Redistribute missing feature weights proportionally.
    4. Compute weighted composite score from ONLY real data.
    5. Map to grade and recommendation.
    """
    # 1. Extract features
    features = build_feature_vector(payload)

    # 2. Separate present vs missing features
    present_factors = []
    missing_factors = []

    for key, display_name, base_weight, score_fn in SCORING_FACTORS:
        raw_val = features.get(key)
        if raw_val is not None:
            sub_score = score_fn(raw_val)
            present_factors.append((key, display_name, base_weight, sub_score, raw_val))
        else:
            missing_factors.append((key, display_name, base_weight))

    # 3. Calculate total weight of present features and normalize
    total_present_weight = sum(w for _, _, w, _, _ in present_factors)

    if total_present_weight == 0:
        # Edge case: no data at all — return a neutral midpoint with warning
        logger.warning("No scoreable data found in payload!")
        return {
            "score": 50,
            "pd": 0.50,
            "grade": "BB+",
            "expected_loss": 0,
            "recommendation": "REFER_TO_COMMITTEE",
            "recommendedLimit": 0,
            "suggestedInterestRate": "14.0%",
            "reasons": [{"factor": "Warning", "text": "Insufficient data to compute a meaningful risk score. Please upload financial documents.", "impact": "Neutral"}],
            "features_used": features,
        }

    # 4. Compute final score: weighted average of ONLY present features
    #    This naturally redistributes missing weights to present ones.
    weighted_sum = sum(sub_score * base_weight for _, _, base_weight, sub_score, _ in present_factors)
    final_score = weighted_sum / total_present_weight  # Weighted average → 0 to 100

    # Build transparent breakdown
    reasons = []
    for key, display_name, base_weight, sub_score, raw_val in present_factors:
        effective_weight = base_weight / total_present_weight
        contribution = sub_score * effective_weight

        # Classify impact based on sub-score
        if sub_score >= 70:
            impact = "+Strength"
            factor_type = "Mitigant"
        elif sub_score <= 30:
            impact = "+Risk"
            factor_type = "Risk Driver"
        else:
            impact = "Neutral"
            factor_type = "Neutral"

        val_str = _format_feature_value(key, raw_val)
        reasons.append({
            "factor": factor_type,
            "text": f"{display_name}: {val_str} (sub-score: {sub_score:.0f}/100, effective weight: {effective_weight * 100:.1f}%)",
            "impact": impact,
            "sub_score": round(sub_score, 1),
            "weight": round(effective_weight, 4),
            "contribution": round(contribution, 2),
        })

    # Add info about missing features
    for key, display_name, base_weight in missing_factors:
        reasons.append({
            "factor": "Excluded",
            "text": f"{display_name}: No data available — weight redistributed to other factors",
            "impact": "Excluded",
            "sub_score": None,
            "weight": 0,
            "contribution": 0,
        })

    # 5. Clamp and round
    final_score = int(round(max(0.0, min(100.0, final_score))))

    # 6. Map to grade, decision, rate
    grade = map_score_to_grade(final_score)
    recommendation, proposed_rate = generate_decision(final_score, grade)

    # PD approximation
    pd_prob = round((100 - final_score) / 100.0, 4)

    # Expected loss
    try:
        raw_limit = payload.get('manualInputs', {}).get('requestedLimit')
        if raw_limit is None:
            raw_limit = 10_000_000
        requested_limit = float(raw_limit)
    except (TypeError, ValueError):
        requested_limit = 10_000_000

    expected_loss = calculate_expected_loss(pd_prob, 0.45, requested_limit)

    # Sort: risk drivers first, then neutral, then mitigants, then excluded
    impact_order = {"+Risk": 0, "Neutral": 1, "+Strength": 2, "Excluded": 3}
    reasons.sort(key=lambda r: (impact_order.get(r["impact"], 1), -(r.get("weight") or 0)))

    # Build reasoning_breakdown for the frontend ReasoningAccordion component
    reasoning_breakdown = []
    for key, display_name, base_weight, sub_score, raw_val in present_factors:
        effective_weight = base_weight / total_present_weight
        direction = "positive" if sub_score >= 70 else ("negative" if sub_score <= 30 else "neutral")
        reasoning_breakdown.append({
            "factor_name": display_name,
            "weight_pct": round(effective_weight * 100, 1),
            "raw_value": _format_feature_value(key, raw_val),
            "score": round(sub_score),
            "weighted_contribution": round(sub_score * effective_weight, 2),
            "reasoning": f"{display_name}: {_format_feature_value(key, raw_val)} — sub-score {sub_score:.0f}/100",
            "direction": direction,
        })

    # Build verdict summary for the frontend
    top_for = [f["factor_name"] for f in reasoning_breakdown if f["direction"] == "positive"][:3]
    top_against = [f["factor_name"] for f in reasoning_breakdown if f["direction"] == "negative"][:2]
    verdict = {
        "decision": recommendation,
        "score": final_score,
        "grade": grade,
        "top_factors_for": top_for,
        "top_factors_against": top_against,
        "summary": f"Decision: {recommendation}. "
                   + (f"Top strengths: {', '.join(top_for)}. " if top_for else "")
                   + (f"Risk factors: {', '.join(top_against)}." if top_against else ""),
    }

    logger.info(
        f"Risk score: {final_score}/100 | Grade: {grade} | PD: {pd_prob} | "
        f"Factors: {len(present_factors)} present, {len(missing_factors)} excluded"
    )

    # Legacy drivers format for frontend 5Cs section visibility
    drivers = [
        {
            "factor": entry["factor_name"],
            "weight": entry["weight_pct"] / 100,
            "impact": entry["weighted_contribution"],
            "reason": entry["reasoning"],
        }
        for entry in reasoning_breakdown
    ]

    return {
        "score": final_score,
        "pd": pd_prob,
        "grade": grade,
        "decision": recommendation,
        "expected_loss": round(expected_loss, 2),
        "recommendation": recommendation,
        "recommendedLimit": requested_limit,
        "suggestedInterestRate": proposed_rate,
        "reasoning_breakdown": reasoning_breakdown,
        "verdict": verdict,
        "drivers": drivers,
        "reasons": reasons,
        "features_used": features,
    }
