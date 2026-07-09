import enum
from datetime import datetime
import json as _json
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text,
    DateTime, Enum, ForeignKey
)
from sqlalchemy.types import TypeDecorator, TEXT
from sqlalchemy.orm import relationship


class JSONEncodedList(TypeDecorator):
    """Stores a Python list as a JSON-encoded string. Works on SQLite AND PostgreSQL."""
    impl = TEXT
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return "[]"
        return _json.dumps(value)

    def process_result_value(self, value, dialect):
        if not value:
            return []
        try:
            return _json.loads(value)
        except Exception:
            return []
from app.database import Base


# ──────────────────────────────────────────
# Enums
# ──────────────────────────────────────────

class UserRole(str, enum.Enum):
    admin = "Admin"
    manager = "Manager"
    sales = "Sales"


class LeadStatus(str, enum.Enum):
    new = "New"
    call_completed = "Call Completed"
    callback_requested = "Callback Requested"
    site_visit_scheduled = "Site Visit Scheduled"
    converted = "Converted"
    lost = "Lost"


class LeadCategory(str, enum.Enum):
    hot = "Hot"
    warm = "Warm"
    cold = "Cold"


class AppointmentType(str, enum.Enum):
    site_visit = "Site Visit"
    callback = "Callback"
    video_call = "Video Call"


class AppointmentStatus(str, enum.Enum):
    pending = "Pending"
    approved = "Approved"
    cancelled = "Cancelled"
    completed = "Completed"


class PropertyType(str, enum.Enum):
    apartment = "Apartment"
    villa = "Villa"
    plot = "Plot"
    commercial = "Commercial Office"


class PropertyStatus(str, enum.Enum):
    available = "Available"
    few_left = "Few Units Left"
    sold_out = "Sold Out"


# ──────────────────────────────────────────
# Models
# ──────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.sales, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Lead(Base):
    __tablename__ = "leads"

    id = Column(String(20), primary_key=True, index=True)  # e.g. C-9843
    name = Column(String(120), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(255), nullable=True)
    property_type = Column(String(60), nullable=True)
    location = Column(String(120), nullable=True)
    budget = Column(String(60), nullable=True)
    timeline = Column(String(60), nullable=True)
    score = Column(Integer, default=0)
    score_category = Column(Enum(LeadCategory), default=LeadCategory.cold)
    status = Column(Enum(LeadStatus), default=LeadStatus.new)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    calls = relationship("Call", back_populates="lead", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="lead", cascade="all, delete-orphan")


class Call(Base):
    __tablename__ = "calls"

    id = Column(String(20), primary_key=True, index=True)  # e.g. CALL-001
    lead_id = Column(String(20), ForeignKey("leads.id"), nullable=True)
    duration_seconds = Column(Integer, default=0)
    caller_phone = Column(String(20), nullable=True)
    recording_url = Column(String(500), nullable=True)
    transcript = Column(Text, nullable=True)
    ai_summary = Column(Text, nullable=True)
    ai_intent = Column(String(120), nullable=True)
    score_at_call = Column(Integer, nullable=True)
    category = Column(Enum(LeadCategory), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    lead = relationship("Lead", back_populates="calls")

    @property
    def lead_name(self) -> str:
        return self.lead.name if self.lead else "Anonymous"

    @property
    def lead_location(self) -> str:
        return self.lead.location if self.lead else ""

    @property
    def lead_budget(self) -> str:
        return self.lead.budget if self.lead else ""


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String(20), primary_key=True, index=True)  # e.g. APT-001
    lead_id = Column(String(20), ForeignKey("leads.id"), nullable=True)
    slot_datetime = Column(DateTime, nullable=False)
    type = Column(Enum(AppointmentType), default=AppointmentType.site_visit)
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.pending)
    notes = Column(Text, nullable=True)
    property_id = Column(String(20), ForeignKey("properties.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    lead = relationship("Lead", back_populates="appointments")
    prop_obj = relationship("Property", back_populates="appointments", foreign_keys=[property_id])

    @property
    def lead_name(self) -> str:
        return self.lead.name if self.lead else "Unknown"

    @property
    def lead_phone(self) -> str:
        return self.lead.phone if self.lead else ""

    @property
    def property_name(self) -> str:
        return self.prop_obj.name if self.prop_obj else "General Inquiry"


class Property(Base):
    __tablename__ = "properties"

    id = Column(String(20), primary_key=True, index=True)  # e.g. PROP-101
    name = Column(String(200), nullable=False)
    location = Column(String(200), nullable=False)
    type = Column(Enum(PropertyType), nullable=False)
    price = Column(String(60), nullable=False)
    sqft = Column(String(40), nullable=True)
    builder = Column(String(200), nullable=True)
    amenities = Column(JSONEncodedList, default=list)
    status = Column(Enum(PropertyStatus), default=PropertyStatus.available)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    appointments = relationship("Appointment", back_populates="prop_obj")


class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True)
    agent_name = Column(String(120), default="EstateAI Receptionist")
    voice_model = Column(String(60), default="eleven_rachel")
    temperature = Column(Float, default=0.3)
    system_prompt = Column(Text, nullable=True)
    qualify_budget = Column(Boolean, default=True)
    auto_site_visit = Column(Boolean, default=True)
    whatsapp_followup = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
