"""
Payment vs Physical Progress Anomaly Detection Service (AI-05)
Evaluates alignment between cumulative financial disbursements
and verified physical execution milestones.
Advisory only — never declares fraud per rules.md §12.
"""
from app.schemas import PaymentProgressRequest, SignalResponse


def analyze_payment_progress(req: PaymentProgressRequest) -> SignalResponse:
    sanc = float(req.sanctioned_cost)
    disb = float(req.total_disbursed)
    phys = float(req.percent_complete)

    if sanc > 0:
        fin_pct = round((disb / sanc) * 100, 2)
    else:
        fin_pct = 0.0

    gap = round(fin_pct - phys, 2)

    if gap >= 35.0:
        severity = "HIGH"
        score = min(95, max(75, int(75 + (gap - 35.0) * 0.6)))
        message = (
            f"Financial disbursement ({fin_pct:.1f}%) substantially exceeds reported "
            f"physical execution ({phys:.1f}%). Discrepancy gap of {gap:.1f}%. "
            f"Ground verification recommended before further fund release."
        )
    elif gap >= 15.0:
        severity = "MEDIUM"
        score = min(74, max(40, int(40 + gap * 1.2)))
        message = (
            f"Financial disbursement ({fin_pct:.1f}%) moderately outpaces reported "
            f"physical execution ({phys:.1f}%). Verification recommended."
        )
    else:
        severity = "LOW"
        score = max(5, min(35, int(max(0.0, gap * 0.5))))
        message = (
            f"Financial disbursement ({fin_pct:.1f}%) and physical execution "
            f"({phys:.1f}%) are proportionately aligned."
        )

    evidence = {
        "sanctioned_cost": sanc,
        "total_disbursed": disb,
        "financial_disbursed_percent": fin_pct,
        "physical_percent_complete": phys,
        "discrepancy_gap_percent": gap,
    }

    return SignalResponse(
        signal_type="PAYMENT_PROGRESS_MISMATCH",
        severity=severity,
        score=score,
        status="OK",
        message=message,
        evidence=evidence,
        model_or_rule="DISBURSEMENT_PROGRESS_GAP_V1",
    )

