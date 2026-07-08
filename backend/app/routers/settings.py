from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app import models, schemas
from app.database import get_db
from app.auth_utils import get_current_user, require_admin

router = APIRouter(prefix="/api/settings", tags=["System Settings"])


def get_or_create_settings(db: Session) -> models.SystemSettings:
    """Get the singleton settings row, or create it with defaults."""
    settings = db.query(models.SystemSettings).first()
    if not settings:
        settings = models.SystemSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("", response_model=schemas.SettingsOut)
def get_settings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get the current AI agent system configuration."""
    return get_or_create_settings(db)


@router.patch("", response_model=schemas.SettingsOut)
def update_settings(
    update: schemas.SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    """Update AI agent configuration. Admin only."""
    settings = get_or_create_settings(db)
    for field, value in update.model_dump(exclude_none=True).items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return settings


@router.get("/analytics/overview", tags=["Analytics"])
def analytics_overview(
    days: int | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return high-level CRM analytics for the Overview dashboard page."""
    lead_query = db.query(models.Lead)
    call_query = db.query(models.Call)
    apt_query = db.query(models.Appointment)

    if days:
        threshold = datetime.utcnow() - timedelta(days=days)
        lead_query = lead_query.filter(models.Lead.created_at >= threshold)
        call_query = call_query.filter(models.Call.created_at >= threshold)
        apt_query = apt_query.filter(models.Appointment.created_at >= threshold)

    total_leads = lead_query.count()
    total_calls = call_query.count()
    hot = lead_query.filter(models.Lead.score_category == models.LeadCategory.hot).count()
    warm = lead_query.filter(models.Lead.score_category == models.LeadCategory.warm).count()
    cold = lead_query.filter(models.Lead.score_category == models.LeadCategory.cold).count()
    site_visits = apt_query.filter(
        models.Appointment.type == models.AppointmentType.site_visit
    ).count()
    conversion_rate = round((site_visits / total_leads * 100), 1) if total_leads else 0.0

    return schemas.AnalyticsSummary(
        total_calls=total_calls,
        total_leads=total_leads,
        hot_leads=hot,
        warm_leads=warm,
        cold_leads=cold,
        site_visits_scheduled=site_visits,
        conversion_rate=conversion_rate,
        ai_answer_rate=100.0,
    )
