"""
Execution Delay & Staleness Analysis Service (AI-04)
Evaluates project progress gaps, elapsed time since sanction,
and timeline deviations using rules-first heuristics.
Advisory only — never declares fraud per rules.md §12.
"""
from app.schemas import DelayCheckRequest, SignalResponse


def analyze_delay(req: DelayCheckRequest) -> SignalResponse:
    status = (req.project_status or "").upper()
    days_prog = req.days_since_last_progress
    days_sanc = req.days_since_sanction
    pct = req.percent_complete or 0.0
    expected = req.expected_duration_days or 180

    if status in ["COMPLETED", "PHYSICALLY_COMPLETE", "COMMISSIONED"]:
        return SignalResponse(
            signal_type="DELAY_STALENESS",
            severity="LOW",
            score=0,
            status="OK",
            message="Work has achieved completion. No ongoing execution delays present.",
            evidence={
                "project_status": status,
                "percent_complete": pct,
            },
            model_or_rule="DELAY_RULES_V1",
        )

    # 1. Critical stall in active progress (>180 days gap)
    if days_prog is not None and days_prog >= 180 and pct < 100:
        severity = "HIGH"
        score = 85
        message = (
            f"Substantial project delay detected: {days_prog} days have elapsed "
            f"without progress update. Ground verification recommended."
        )
    # 2. Overdue past scheduled completion
    elif days_sanc is not None and days_sanc > expected and pct < 100:
        overdue_days = days_sanc - expected
        if overdue_days >= 90:
            severity = "HIGH"
            score = 78
            message = (
                f"Work is {overdue_days} days past scheduled completion ({expected} days) "
                f"with {pct:.0f}% completed. Ground verification recommended."
            )
        else:
            severity = "MEDIUM"
            score = 55
            message = (
                f"Work has exceeded expected duration ({expected} days) by {overdue_days} days "
                f"(current progress {pct:.0f}%). Review recommended."
            )
    # 3. Moderate progress gap (>90 days)
    elif days_prog is not None and days_prog >= 90 and pct < 100:
        severity = "MEDIUM"
        score = 50
        message = (
            f"Execution pace delayed: {days_prog} days since last reported progress update."
        )
    # 4. Sanctioned with no initial progress logged for >60 days
    elif status == "SANCTIONED" and days_sanc is not None and days_sanc >= 60 and (days_prog is None or days_prog >= 60):
        severity = "MEDIUM"
        score = 45
        message = (
            f"Work sanctioned {days_sanc} days ago with no physical mobilization recorded."
        )
    else:
        severity = "LOW"
        score = 10
        message = "Project execution timeline is active and within normal reporting intervals."

    evidence = {
        "project_status": status,
        "days_since_last_progress": days_prog,
        "days_since_sanction": days_sanc,
        "percent_complete": pct,
        "expected_duration_days": expected,
    }

    return SignalResponse(
        signal_type="DELAY_STALENESS",
        severity=severity,
        score=score,
        status="OK",
        message=message,
        evidence=evidence,
        model_or_rule="DELAY_RULES_V1",
    )

