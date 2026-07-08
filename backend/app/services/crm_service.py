"""
crm_service.py
──────────────
Database integration service for the AI Voice Agent.
Provides clean methods for:
  - Lead creation / lookup / update
  - Property search
  - Appointment booking
  - Call record saving
"""
import json
from datetime import datetime
from sqlalchemy.orm import Session

from app import models
from app.database import SessionLocal


class CRMService:

    # ── Lead Methods ─────────────────────────────────────────────────────────
    @staticmethod
    def find_or_create_lead(phone: str, name: str = "Interested Buyer") -> models.Lead:
        """Returns an existing Lead by phone, or creates a new one."""
        with SessionLocal() as db:
            lead = db.query(models.Lead).filter(models.Lead.phone == phone).first()
            if not lead:
                count = db.query(models.Lead).count()
                lead_id = f"C-{9000 + count + 1}"
                lead = models.Lead(
                    id=lead_id,
                    name=name,
                    phone=phone,
                    status=models.LeadStatus.new,
                    score=0,
                    score_category=models.LeadCategory.cold,
                    property_type="Apartment",
                    location="Chennai",
                    budget="Not specified",
                    timeline="Browsing",
                )
                db.add(lead)
                db.commit()
                db.refresh(lead)
            return lead

    @staticmethod
    def update_lead_profile(lead_id: str, updates: dict) -> models.Lead | None:
        """Updates specified fields on an existing Lead record."""
        with SessionLocal() as db:
            lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
            if not lead:
                return None
            for key, val in updates.items():
                if val is not None and hasattr(lead, key):
                    setattr(lead, key, val)
            db.commit()
            db.refresh(lead)
            return lead

    # ── Property Methods ─────────────────────────────────────────────────────
    @staticmethod
    def search_properties(query: str) -> list:
        """Searches properties by location or name (case-insensitive)."""
        with SessionLocal() as db:
            props = db.query(models.Property).filter(
                models.Property.location.ilike(f"%{query}%") |
                models.Property.name.ilike(f"%{query}%")
            ).limit(5).all()
            return props

    # ── Appointment Methods ──────────────────────────────────────────────────
    @staticmethod
    def book_appointment(
        lead_id: str,
        slot_datetime: datetime,
        property_id: str | None = None,
        appt_type: str = "Site Visit",
        notes: str | None = None,
    ) -> models.Appointment:
        """Books a new appointment and stores it in the database."""
        with SessionLocal() as db:
            count = db.query(models.Appointment).count()
            apt_id = f"APT-{count + 1:03d}"

            apt_type_enum = models.AppointmentType.site_visit
            if appt_type == "Callback":
                apt_type_enum = models.AppointmentType.callback
            elif appt_type == "Video Call":
                apt_type_enum = models.AppointmentType.video_call

            apt = models.Appointment(
                id=apt_id,
                lead_id=lead_id,
                slot_datetime=slot_datetime,
                type=apt_type_enum,
                status=models.AppointmentStatus.approved,  # Auto-approved by AI
                property_id=property_id,
                notes=notes,
            )
            db.add(apt)
            db.commit()
            db.refresh(apt)
            return apt

    # ── Call Methods ─────────────────────────────────────────────────────────
    @staticmethod
    def save_call_record(
        call_id: str,
        lead_id: str,
        duration: int,
        phone: str,
        summary: str,
        transcript: str,
        score: int,
        category: str,
    ) -> models.Call:
        """Creates a new Call log record in the database."""
        with SessionLocal() as db:
            # Prevent duplicate call_id
            existing = db.query(models.Call).filter(models.Call.id == call_id).first()
            if existing:
                call_id = f"{call_id}-DUP"

            category_enum = models.LeadCategory.cold
            if category == "Hot":
                category_enum = models.LeadCategory.hot
            elif category == "Warm":
                category_enum = models.LeadCategory.warm

            call = models.Call(
                id=call_id,
                lead_id=lead_id,
                duration_seconds=duration,
                caller_phone=phone,
                recording_url=None,
                transcript=transcript,
                ai_summary=summary,
                ai_intent=(
                    "Site Visit Inquiry"
                    if "visit" in summary.lower()
                    else "General Pricing Enquiry"
                ),
                score_at_call=score,
                category=category_enum,
            )
            db.add(call)
            db.commit()
            db.refresh(call)
            return call
