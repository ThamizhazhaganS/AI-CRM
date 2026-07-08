from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from app.auth_utils import get_current_user, require_manager_or_above

router = APIRouter(prefix="/api/properties", tags=["Properties"])


def generate_prop_id(db: Session) -> str:
    count = db.query(models.Property).count()
    return f"PROP-{count + 101}"


@router.get("", response_model=List[schemas.PropertyOut])
def list_properties(
    status: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all properties in the portfolio."""
    query = db.query(models.Property)
    if status:
        query = query.filter(models.Property.status == models.PropertyStatus(status))
    if type:
        query = query.filter(models.Property.type == models.PropertyType(type))
    return query.order_by(models.Property.created_at.desc()).all()


@router.post("", response_model=schemas.PropertyOut, status_code=201)
def create_property(
    prop_in: schemas.PropertyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager_or_above),
):
    """Add a new property listing. Requires Manager or Admin."""
    new_prop = models.Property(
        id=generate_prop_id(db),
        **prop_in.model_dump(),
    )
    db.add(new_prop)
    db.commit()
    db.refresh(new_prop)
    return new_prop


@router.get("/{property_id}", response_model=schemas.PropertyOut)
def get_property(
    property_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get a single property by ID."""
    prop = db.query(models.Property).filter(models.Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found.")
    return prop


@router.patch("/{property_id}", response_model=schemas.PropertyOut)
def update_property(
    property_id: str,
    update: schemas.PropertyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager_or_above),
):
    """Update a property listing. Requires Manager or Admin."""
    prop = db.query(models.Property).filter(models.Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found.")
    for field, value in update.model_dump(exclude_none=True).items():
        setattr(prop, field, value)
    db.commit()
    db.refresh(prop)
    return prop


@router.delete("/{property_id}", status_code=204)
def delete_property(
    property_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_manager_or_above),
):
    """Delete a property. Requires Manager or Admin."""
    prop = db.query(models.Property).filter(models.Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found.")
    db.delete(prop)
    db.commit()
