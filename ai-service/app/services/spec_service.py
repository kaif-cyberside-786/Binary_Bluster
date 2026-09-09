"""
Engineering Specification & DPR Comparison Service (AI-03)
Quantifies variance between the original MP recommendation outlay/scope
and the Detailed Project Report (DPR) prepared by the implementing agency.
Advisory only — never declares fraud per rules.md §12.
"""
from typing import Set
from app.schemas import SpecComparisonRequest, SignalResponse


def _compute_word_overlap(text1: str, text2: str) -> float:
    def _clean_tokens(t: str) -> Set[str]:
        words = [w.strip().lower() for w in t.split() if len(w.strip()) > 2]
        return set(words)

    tokens1 = _clean_tokens(text1 or "")
    tokens2 = _clean_tokens(text2 or "")

    if not tokens1 or not tokens2:
        return 1.0  # neutral if one is empty

    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return round(len(intersection) / len(union), 3) if union else 1.0


def analyze_spec_comparison(req: SpecComparisonRequest) -> SignalResponse:
    rec_cost = float(req.estimated_cost)
    eng_cost = float(req.detailed_estimate)

    if rec_cost > 0:
        drift_pct = round(((eng_cost - rec_cost) / rec_cost) * 100, 2)
    else:
        drift_pct = 0.0

    scope_similarity = _compute_word_overlap(
        req.recommendation_description, req.engineering_remarks
    )

    if drift_pct >= 25.0:
        severity = "HIGH"
        score = min(95, max(75, int(75 + (drift_pct - 25.0) * 0.7)))
        message = (
            f"Detailed engineering estimate (₹{eng_cost:,.0f}) deviates +{drift_pct:.1f}% "
            f"above original recommended outlay (₹{rec_cost:,.0f}). "
            f"Review of technical sanction recommended."
        )
    elif drift_pct >= 10.0:
        severity = "MEDIUM"
        score = min(74, max(40, int(40 + drift_pct * 1.4)))
        message = (
            f"Moderate specification and cost deviation (+{drift_pct:.1f}%) observed "
            f"between recommendation and engineering DPR."
        )
    elif drift_pct <= -25.0:
        severity = "MEDIUM"
        score = 50
        message = (
            f"Engineering estimate is significantly lower ({drift_pct:.1f}%) than recommended outlay. "
            f"Scope reduction verification recommended."
        )
    else:
        severity = "LOW"
        score = max(5, min(35, int(abs(drift_pct))))
        message = (
            f"Engineering DPR estimate conforms within acceptable tolerance ({drift_pct:+.1f}%) "
            f"of recommended outlay."
        )

    evidence = {
        "recommended_cost": rec_cost,
        "engineering_estimate": eng_cost,
        "cost_drift_percent": drift_pct,
        "scope_lexical_similarity": scope_similarity,
        "prior_estimates_count": len(req.prior_estimates or []),
    }

    return SignalResponse(
        signal_type="SPEC_DEVIATION",
        severity=severity,
        score=score,
        status="OK",
        message=message,
        evidence=evidence,
        model_or_rule="SPEC_VARIANCE_V1",
    )

