"""
Cost Anomaly Detection Service (AI-01)
Evaluates proposed project expenditure against historical peer group benchmarks
using non-parametric statistical metrics (Median, Quartiles, IQR, Deviation %).
Advisory only — never declares fraud per rules.md §12.
"""
from typing import List, Optional
import numpy as np
from app.schemas import CostAnomalyRequest, SignalResponse


def analyze_cost_anomaly(req: CostAnomalyRequest) -> SignalResponse:
    valid_peers = [c for c in req.peer_costs if c is not None and c > 0]
    peer_count = len(valid_peers)
    category = req.category or "unspecified"

    # Insufficient data guardrail
    if peer_count < 2:
        return SignalResponse(
            signal_type="COST_ANOMALY",
            severity="LOW",
            score=0,
            status="INSUFFICIENT_DATA",
            message=f"Insufficient comparable historical projects ({peer_count} found) in category '{category}' for statistical anomaly evaluation.",
            evidence={
                "proposed_cost": req.proposed_cost,
                "peer_count": peer_count,
                "peer_median": None,
                "deviation_percent": None,
                "iqr": None,
                "category": category,
            },
            model_or_rule="PEER_IQR_V1",
        )

    # Compute non-parametric statistics
    arr = np.array(valid_peers, dtype=float)
    median = float(np.median(arr))
    q1 = float(np.percentile(arr, 25))
    q3 = float(np.percentile(arr, 75))
    iqr = float(q3 - q1)
    upper_fence = float(q3 + 1.5 * iqr) if iqr > 0 else median * 1.5

    if median > 0:
        deviation_percent = round(((req.proposed_cost - median) / median) * 100, 2)
    else:
        deviation_percent = 0.0

    # Classify severity and compute normalized risk score (0-100)
    if deviation_percent >= 50.0 or (req.proposed_cost > upper_fence and deviation_percent >= 35.0):
        severity = "HIGH"
        # Scale score from 75 to 95 based on excess deviation
        excess = max(0.0, deviation_percent - 50.0)
        score = min(95, int(75 + excess / 4))
        message = (
            f"Proposed cost ₹{req.proposed_cost:,.0f} is +{deviation_percent:.1f}% above "
            f"historical peer median (₹{median:,.0f}) across {peer_count} works. "
            f"Potential cost anomaly. Review recommended."
        )
    elif deviation_percent >= 20.0 or req.proposed_cost > q3:
        severity = "MEDIUM"
        score = min(74, max(40, int(40 + deviation_percent * 0.7)))
        message = (
            f"Proposed cost ₹{req.proposed_cost:,.0f} deviates +{deviation_percent:.1f}% above "
            f"peer median (₹{median:,.0f}). Verification recommended."
        )
    else:
        severity = "LOW"
        score = max(5, min(35, int(15 + max(0.0, deviation_percent * 0.5))))
        message = (
            f"Proposed cost ₹{req.proposed_cost:,.0f} conforms to historical peer distribution "
            f"(median ₹{median:,.0f} across {peer_count} comparable works)."
        )

    evidence = {
        "proposed_cost": req.proposed_cost,
        "peer_median": round(median, 2),
        "peer_count": peer_count,
        "deviation_percent": deviation_percent,
        "q1": round(q1, 2),
        "q3": round(q3, 2),
        "iqr": round(iqr, 2),
        "upper_fence": round(upper_fence, 2),
        "category": category,
        "district": req.district,
    }

    return SignalResponse(
        signal_type="COST_ANOMALY",
        severity=severity,
        score=score,
        status="OK",
        message=message,
        evidence=evidence,
        model_or_rule="PEER_IQR_V1",
    )
