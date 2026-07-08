import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from app.auth_utils import get_current_user, require_manager_or_above
from app.lead_scorer import calculate_lead_score

router = APIRouter(prefix="/api/leads", tags=["Leads"])


def generate_lead_id(db: Session) -> str:
    count = db.query(models.Lead).count()
    return f"C-{9000 + count + 1}"


@router.get("", response_model=List[schemas.LeadOut])
def list_leads(
    category: Optional[str] = Query(None, description="Filter by Hot/Warm/Cold"),
    status: Optional[str] = Query(None, description="Filter by lead status"),
    search: Optional[str] = Query(None, description="Search by name, phone, or location"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all leads with optional filtering. Sales role cannot see Cold leads."""
    query = db.query(models.Lead)

    # RBAC: Sales cannot see Cold leads
    if current_user.role == models.UserRole.sales:
        query = query.filter(models.Lead.score_category != models.LeadCategory.cold)

    if category:
        query = query.filter(models.Lead.score_category == models.LeadCategory(category))
    if status:
        query = query.filter(models.Lead.status == models.LeadStatus(status))
    if search:
        query = query.filter(
            models.Lead.name.ilike(f"%{search}%") |
            models.Lead.phone.ilike(f"%{search}%") |
            models.Lead.location.ilike(f"%{search}%")
        )

    return query.order_by(models.Lead.created_at.desc()).all()


@router.post("", response_model=schemas.LeadOut, status_code=201)
def create_lead(
    lead_in: schemas.LeadCreate,
    site_visit_requested: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a new lead and auto-score it."""
    score, category = calculate_lead_score(
        budget=lead_in.budget,
        timeline=lead_in.timeline,
        site_visit_requested=site_visit_requested,
        email=lead_in.email,
        property_type=lead_in.property_type,
    )

    new_lead = models.Lead(
        id=generate_lead_id(db),
        score=score,
        score_category=category,
        **lead_in.model_dump(),
    )
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)
    return new_lead


@router.get("/{lead_id}", response_model=schemas.LeadOut)
def get_lead(
    lead_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Retrieve a single lead by ID."""
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")
    # Sales cannot access Cold leads
    if current_user.role == models.UserRole.sales and lead.score_category == models.LeadCategory.cold:
        raise HTTPException(status_code=403, detail="Access denied: Cold leads not visible to Sales role.")
    return lead


@router.patch("/{lead_id}", response_model=schemas.LeadOut)
def update_lead(
    lead_id: str,
    update: schemas.LeadUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager_or_above),
):
    """Update lead status or score. Requires Manager or Admin role."""
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")

    for field, value in update.model_dump(exclude_none=True).items():
        setattr(lead, field, value)

    db.commit()
    db.refresh(lead)
    return lead


@router.delete("/{lead_id}", status_code=204)
def delete_lead(
    lead_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager_or_above),
):
    """Delete a lead. Requires Manager or Admin role."""
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")
    db.delete(lead)
    db.commit()
