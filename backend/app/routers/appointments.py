from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from app.auth_utils import get_current_user, require_manager_or_above

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])


def generate_apt_id(db: Session) -> str:
    count = db.query(models.Appointment).count()
    return f"APT-{count + 1:03d}"


@router.get("", response_model=List[schemas.AppointmentOut])
def list_appointments(
    status: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all appointments with optional filters."""
    query = db.query(models.Appointment)
    if status:
        query = query.filter(models.Appointment.status == models.AppointmentStatus(status))
    if type:
        query = query.filter(models.Appointment.type == models.AppointmentType(type))
    return query.order_by(models.Appointment.slot_datetime.asc()).all()


@router.post("", response_model=schemas.AppointmentOut, status_code=201)
def create_appointment(
    apt_in: schemas.AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a new site visit or callback appointment."""
    new_apt = models.Appointment(
        id=generate_apt_id(db),
        **apt_in.model_dump(),
    )
    db.add(new_apt)
    db.commit()
    db.refresh(new_apt)
    return new_apt


@router.patch("/{apt_id}", response_model=schemas.AppointmentOut)
def update_appointment(
    apt_id: str,
    update: schemas.AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager_or_above),
):
    """Approve, cancel, or update an appointment. Requires Manager or Admin."""
    apt = db.query(models.Appointment).filter(models.Appointment.id == apt_id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found.")
    for field, value in update.model_dump(exclude_none=True).items():
        setattr(apt, field, value)
    db.commit()
    db.refresh(apt)
    return apt


@router.delete("/{apt_id}", status_code=204)
def cancel_appointment(
    apt_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager_or_above),
):
    """Cancel/delete an appointment."""
    apt = db.query(models.Appointment).filter(models.Appointment.id == apt_id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found.")
    db.delete(apt)
    db.commit()
