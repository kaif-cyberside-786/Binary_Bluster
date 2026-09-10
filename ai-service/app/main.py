"""
FastAPI Entry Point for MPLADS AI Analytics Service
Stateless analytical and ML microservice invoked solely by Express backend.
Complies with architecture.md §4, §13, and rules.md §4, §12.
"""
import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware


def _load_env_files():
    """Load key-value pairs from .env files if not already in os.environ."""
    candidates = [
        Path(__file__).resolve().parent.parent / ".env",
        Path(__file__).resolve().parent.parent.parent / "backend-node" / ".env",
        Path(__file__).resolve().parent.parent.parent / ".env",
    ]
    for env_path in candidates:
        if env_path.is_file():
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k, v = k.strip(), v.strip().strip("'\"")
                            if k and k not in os.environ:
                                os.environ[k] = v
            except Exception:
                pass


_load_env_files()
from app.schemas import (
    SignalResponse,
    CostAnomalyRequest,
    DuplicateCheckRequest,
    SpecComparisonRequest,
    DelayCheckRequest,
    PaymentProgressRequest,
    ExplanationRequest,
    ExplanationResponse,
    AgencySuitabilityRequest,
    AgencySuitabilityResponse,
    AgencyConcentrationRequest,
    AgencyConcentrationResponse,
)
from app.services.cost_service import analyze_cost_anomaly
from app.services.duplicate_service import analyze_duplicates
from app.services.spec_service import analyze_spec_comparison
from app.services.delay_service import analyze_delay
from app.services.payment_service import analyze_payment_progress
from app.services.agency_service import analyze_agency_suitability, analyze_agency_concentration
from app.gateway.ai_gateway import ai_gateway

app = FastAPI(
    title="MPLADS AI Analytics Service",
    description="Historical Intelligence & Anomaly Detection microservice for MPLADS Decision Support",
    version="1.0.0",
)

# Restrict CORS to internal callers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "mplads-ai-service",
        "version": "1.0.0",
        "engine": "fastapi",
    }


@app.post("/ai/cost-anomaly", response_model=SignalResponse)
def cost_anomaly_endpoint(req: CostAnomalyRequest):
    try:
        return analyze_cost_anomaly(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cost anomaly analysis error: {str(e)}")


@app.post("/ai/duplicate-check", response_model=SignalResponse)
def duplicate_check_endpoint(req: DuplicateCheckRequest):
    try:
        return analyze_duplicates(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Duplicate check error: {str(e)}")


@app.post("/ai/spec-comparison", response_model=SignalResponse)
def spec_comparison_endpoint(req: SpecComparisonRequest):
    try:
        return analyze_spec_comparison(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Specification comparison error: {str(e)}")


@app.post("/ai/delay-check", response_model=SignalResponse)
def delay_check_endpoint(req: DelayCheckRequest):
    try:
        return analyze_delay(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delay check error: {str(e)}")


@app.post("/ai/payment-progress-check", response_model=SignalResponse)
def payment_progress_endpoint(req: PaymentProgressRequest):
    try:
        return analyze_payment_progress(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment progress check error: {str(e)}")


@app.post("/ai/explain", response_model=ExplanationResponse)
def explain_endpoint(req: ExplanationRequest):
    try:
        res = ai_gateway.generate_explanation(
            overall_score=req.overall_score,
            risk_level=req.risk_level,
            category=req.category,
            top_contributors=req.top_contributors,
            evidence=req.evidence,
            provider=req.provider,
            model=req.model,
            api_key=req.api_key,
        )
        return ExplanationResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Gateway explanation error: {str(e)}")


@app.post("/ai/agency-suitability", response_model=AgencySuitabilityResponse)
def agency_suitability_endpoint(req: AgencySuitabilityRequest):
    try:
        return analyze_agency_suitability(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agency suitability analysis error: {str(e)}")


@app.post("/ai/agency-concentration", response_model=AgencyConcentrationResponse)
def agency_concentration_endpoint(req: AgencyConcentrationRequest):
    try:
        return analyze_agency_concentration(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agency concentration analysis error: {str(e)}")


