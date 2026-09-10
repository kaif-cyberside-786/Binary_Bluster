"""
Agency Intelligence Service for Python Microservice
Implements analytics for Agency Suitability and Agency Concentration per architecture.md §13 & rules.md §12.
"""
from typing import Dict, Any, List
from app.schemas import (
    AgencySuitabilityRequest,
    AgencySuitabilityResponse,
    RankedAgency,
    AgencyConcentrationRequest,
    AgencyConcentrationResponse,
    ConcentrationItem,
)

ADVISORY_DISCLAIMER = (
    "Suggested agencies are advisory only per rules.md §12. "
    "Statutory selection authority remains exclusively with the District Authority."
)

CATEGORY_SYNERGY = {
    "ROADS": ["PWD", "OTHER", "CPWD"],
    "BRIDGES": ["PWD", "OTHER", "CPWD"],
    "DRINKING_WATER": ["RES", "MUNICIPAL_CORP", "OTHER", "PWD"],
    "SANITATION": ["MUNICIPAL_CORP", "RES", "ZILA_PANCHAYAT"],
    "EDUCATION": ["RES", "PWD", "CPWD"],
    "HEALTH": ["PWD", "CPWD", "RES"],
    "COMMUNITY_HALL": ["RES", "PWD", "MUNICIPAL_CORP"],
    "IRRIGATION": ["IRRIGATION_DEPT", "RES", "OTHER"],
    "OTHER": ["PWD", "RES", "CPWD", "MUNICIPAL_CORP"],
}


def analyze_agency_suitability(req: AgencySuitabilityRequest) -> AgencySuitabilityResponse:
    """
    Computes advisory suitability ranking with statutory concentration guardrail.
    """
    ranked_list: List[RankedAgency] = []
    cat_upper = (req.category or "GENERAL").upper()
    preferred_types = CATEGORY_SYNERGY.get(cat_upper, CATEGORY_SYNERGY["OTHER"])

    for cand in req.candidate_agencies:
        # 1. Completion rate (25% weight)
        comp_rate = cand.completion_rate if cand.completion_rate is not None else 75.0
        comp_score = min(100.0, max(0.0, comp_rate))

        # 2. Timeliness / Delay (20% weight)
        delay_days = cand.avg_delay_days if cand.avg_delay_days is not None else 30
        if delay_days <= 0:
            delay_score = 100.0
        elif delay_days <= 20:
            delay_score = 95.0
        elif delay_days <= 35:
            delay_score = 85.0
        elif delay_days <= 60:
            delay_score = 70.0
        else:
            delay_score = 45.0

        # 3. Cost deviation (20% weight)
        cost_dev = cand.cost_deviation_percentage if cand.cost_deviation_percentage is not None else 5.0
        if cost_dev <= 3.0:
            cost_score = 100.0
        elif cost_dev <= 5.0:
            cost_score = 90.0
        elif cost_dev <= 8.0:
            cost_score = 75.0
        elif cost_dev <= 12.0:
            cost_score = 60.0
        else:
            cost_score = 40.0

        # 4. Clean inspection record (15% weight)
        adverse = cand.adverse_inspections if cand.adverse_inspections is not None else 0
        if adverse == 0:
            insp_score = 100.0
        elif adverse == 1:
            insp_score = 80.0
        elif adverse == 2:
            insp_score = 60.0
        else:
            insp_score = 35.0

        # 5. Category experience (20% weight)
        if preferred_types and preferred_types[0] == cand.type:
            cat_score = 98.0
        elif preferred_types and cand.type in preferred_types:
            cat_score = 90.0
        else:
            cat_score = 75.0

        raw_score = (
            comp_score * 0.25
            + delay_score * 0.20
            + cost_score * 0.20
            + insp_score * 0.15
            + cat_score * 0.20
        )

        # Concentration Guardrail (prd.md §12.8)
        share = cand.district_work_share_percentage or 0.0
        is_warning = share > 35.0
        warning_msg = None
        final_score = int(round(raw_score))

        if is_warning:
            # Score penalty & capped recommendation to prevent reinforcing monopoly concentration
            final_score = max(45, int(round(raw_score - 16)))
            warning_msg = (
                f"⚠ Concentration Guardrail Active: Agency holds {share:.1f}% district work share "
                f"(>35% threshold). Recommendation score capped to prevent reinforcing monopoly concentration."
            )

        metrics = {
            "completion_rate": comp_rate,
            "avg_delay_days": delay_days,
            "cost_deviation_percentage": cost_dev,
            "adverse_inspections": adverse,
            "district_share": share,
        }

        ranked_list.append(
            RankedAgency(
                agency_id=cand.agency_id,
                name=cand.name,
                type=cand.type,
                suitability_score=final_score,
                raw_score=int(round(raw_score)),
                rank=1,  # will assign below
                concentration_warning=is_warning,
                concentration_message=warning_msg,
                metrics=metrics,
            )
        )

    # Sort descending by suitability score
    ranked_list.sort(key=lambda x: x.suitability_score, reverse=True)
    for idx, item in enumerate(ranked_list):
        item.rank = idx + 1

    return AgencySuitabilityResponse(
        product="AGENCY_SUITABILITY",
        project_category=req.category or "GENERAL",
        advisory_disclaimer=ADVISORY_DISCLAIMER,
        concentration_guardrail_applied=any(a.concentration_warning for a in ranked_list),
        suggested_agencies=ranked_list,
    )


def analyze_agency_concentration(req: AgencyConcentrationRequest) -> AgencyConcentrationResponse:
    """
    Computes Herfindahl-Hirschman Index (HHI) and concentration levels.
    """
    hhi = sum(item.herfindahl_index_contribution for item in req.agency_shares)

    if hhi > 2500:
        level = "HIGH"
        summary = "High market concentration detected. One or few agencies hold a dominant share of public works outlay."
    elif hhi >= 1500:
        level = "MODERATE"
        summary = "Moderate concentration observed across public executing agencies."
    else:
        level = "COMPETITIVE"
        summary = "Work distribution is diversified across multiple executing agencies."

    sorted_shares = sorted(req.agency_shares, key=lambda x: x.share_of_value_percentage, reverse=True)

    return AgencyConcentrationResponse(
        product="AGENCY_CONCENTRATION",
        district=req.district,
        state=req.state,
        year=req.year or "2026",
        herfindahl_index=round(hhi, 2),
        concentration_level=level,
        concentration_summary=summary,
        concentration_threshold_percentage=35.0,
        agencies=sorted_shares,
    )

