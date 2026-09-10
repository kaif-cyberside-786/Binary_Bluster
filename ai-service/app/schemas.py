"""
Pydantic schemas for the MPLADS AI Service.
All inputs and outputs strictly typed for internal Express-to-Python communication.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class SignalResponse(BaseModel):
    signal_type: str = Field(..., description="Canonical signal identifier")
    severity: str = Field(..., description="LOW | MEDIUM | HIGH")
    score: int = Field(..., ge=0, le=100, description="Normalized risk score (0-100)")
    status: str = Field(..., description="OK | INSUFFICIENT_DATA | ERROR")
    message: str = Field(..., description="Advisory narrative summary (never declarations of fraud)")
    evidence: Dict[str, Any] = Field(default_factory=dict, description="Structured mathematical/signal evidence")
    model_or_rule: str = Field(..., description="Identifier of algorithm or rule version utilized")


class CostAnomalyRequest(BaseModel):
    proposed_cost: float = Field(..., gt=0, description="Proposed or estimated project outlay in INR")
    peer_costs: List[float] = Field(default_factory=list, description="Historical sanctioned or completed costs of peer projects")
    category: Optional[str] = Field(None, description="Sector/Category of work (e.g. ROADS, DRINKING_WATER)")
    district: Optional[str] = Field(None, description="District name")
    state: Optional[str] = Field(None, description="State name")


class DuplicateCandidate(BaseModel):
    project_id: str
    title: str
    description: Optional[str] = ""
    category: Optional[str] = ""
    district: Optional[str] = ""
    location: Optional[str] = ""
    ward: Optional[str] = ""
    block: Optional[str] = ""
    status: Optional[str] = ""
    sanctioned_cost: Optional[float] = None


class DuplicateCheckRequest(BaseModel):
    target_project: DuplicateCandidate
    candidate_projects: List[DuplicateCandidate] = Field(default_factory=list)
    similarity_threshold: Optional[float] = Field(0.30, ge=0.0, le=1.0)


class SpecComparisonRequest(BaseModel):
    estimated_cost: float = Field(..., description="Initial recommended cost from MP recommendation")
    detailed_estimate: float = Field(..., description="Technical estimate from engineering DPR")
    recommendation_description: Optional[str] = Field("", description="Original recommendation scope description")
    engineering_remarks: Optional[str] = Field("", description="Engineering technical remarks and specifications")
    prior_estimates: Optional[List[float]] = Field(default_factory=list, description="Historical DPR version estimates")


class DelayCheckRequest(BaseModel):
    project_status: str = Field(..., description="Current canonical project status")
    days_since_last_progress: Optional[int] = Field(None, description="Days elapsed since the latest progress entry")
    days_since_sanction: Optional[int] = Field(None, description="Days elapsed since DA sanction approval")
    percent_complete: Optional[float] = Field(0.0, ge=0.0, le=100.0, description="Reported physical progress percentage")
    expected_duration_days: Optional[int] = Field(180, description="Standard scheduled completion duration")


class PaymentProgressRequest(BaseModel):
    sanctioned_cost: float = Field(..., description="Total sanctioned budget outlay")
    total_disbursed: float = Field(..., description="Cumulative payments approved and disbursed")
    percent_complete: float = Field(..., ge=0.0, le=100.0, description="Latest verified physical progress percentage")


class ExplanationRequest(BaseModel):
    overall_score: int = Field(..., ge=0, le=100, description="Overall aggregated risk score")
    risk_level: str = Field(..., description="LOW | MEDIUM | HIGH")
    category: Optional[str] = Field("", description="Work category")
    top_contributors: List[Dict[str, Any]] = Field(default_factory=list, description="Ranked contributing risk signals")
    evidence: Dict[str, Any] = Field(default_factory=dict, description="Structured de-identified evidence metrics")
    provider: Optional[str] = Field("gemini", description="LLM provider: gemini | ollama | mock")
    model: Optional[str] = Field(None, description="Optional model identifier override")
    api_key: Optional[str] = Field(None, description="Optional API key passed from configuration")


class ExplanationResponse(BaseModel):
    status: str = Field(..., description="AI_ANALYSIS_COMPLETE | AI_ANALYSIS_UNAVAILABLE | AI_ANALYSIS_PENDING")
    explanation: str = Field(..., description="Human-readable natural-language explanation")
    provider: str = Field(..., description="Underlying provider utilized")
    model: Optional[str] = Field(None, description="Model identifier used")
    data_minimized: bool = Field(True, description="Strict de-identified evidence adherence guarantee")


# Phase 12: Agency Intelligence Schemas
class CandidateAgency(BaseModel):
    agency_id: str
    name: str
    type: str
    completion_rate: Optional[float] = 75.0
    avg_delay_days: Optional[int] = 30
    cost_deviation_percentage: Optional[float] = 5.0
    adverse_inspections: Optional[int] = 0
    district_work_share_percentage: Optional[float] = 0.0


class RankedAgency(BaseModel):
    agency_id: str
    name: str
    type: str
    suitability_score: int
    raw_score: int
    rank: int
    concentration_warning: bool
    concentration_message: Optional[str] = None
    metrics: Dict[str, Any] = Field(default_factory=dict)


class AgencySuitabilityRequest(BaseModel):
    category: Optional[str] = "GENERAL"
    estimated_cost: Optional[float] = 0.0
    district: Optional[str] = "Indore"
    state: Optional[str] = "Madhya Pradesh"
    candidate_agencies: List[CandidateAgency] = Field(default_factory=list)


class AgencySuitabilityResponse(BaseModel):
    product: str = "AGENCY_SUITABILITY"
    project_category: str
    advisory_disclaimer: str
    concentration_guardrail_applied: bool
    suggested_agencies: List[RankedAgency]


class ConcentrationItem(BaseModel):
    agency_id: str
    name: str
    work_count: int
    total_value: float
    share_of_value_percentage: float
    is_concentration_flagged: bool
    herfindahl_index_contribution: float


class AgencyConcentrationRequest(BaseModel):
    district: str = "Indore"
    state: str = "Madhya Pradesh"
    year: Optional[str] = "2026"
    agency_shares: List[ConcentrationItem] = Field(default_factory=list)


class AgencyConcentrationResponse(BaseModel):
    product: str = "AGENCY_CONCENTRATION"
    district: str
    state: str
    year: str
    herfindahl_index: float
    concentration_level: str
    concentration_summary: str
    concentration_threshold_percentage: float = 35.0
    agencies: List[ConcentrationItem]


