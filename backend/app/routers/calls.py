from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app import models, schemas
from app.database import get_db
from app.auth_utils import get_current_user

router = APIRouter(prefix="/api/calls", tags=["Call Logs"])


@router.get("", response_model=List[schemas.CallOut])
def list_calls(
    lead_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all call records with optional filters."""
    query = db.query(models.Call)
    if lead_id:
        query = query.filter(models.Call.lead_id == lead_id)
    if category:
        query = query.filter(models.Call.category == models.LeadCategory(category))
    return query.order_by(models.Call.created_at.desc()).all()


@router.get("/{call_id}", response_model=schemas.CallOut)
def get_call(
    call_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Retrieve a single call record by ID."""
    call = db.query(models.Call).filter(models.Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call record not found.")
    return call


@router.get("/analytics/summary")
def call_analytics(
    days: int | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return summary analytics for the call logs page."""
    call_query = db.query(models.Call)
    if days:
        threshold = datetime.utcnow() - timedelta(days=days)
        call_query = call_query.filter(models.Call.created_at >= threshold)

    total = call_query.count()
    calls = call_query.all()
    avg_duration = (
        sum(c.duration_seconds for c in calls) / total if total else 0
    )
    return {
        "total_calls": total,
        "avg_duration_seconds": round(avg_duration),
        "ai_answer_rate": 100.0,
        "transcripts_available": sum(1 for c in calls if c.transcript),
    }
