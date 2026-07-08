from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr


# ──────────────────────────────────────────
# Auth Schemas
# ──────────────────────────────────────────

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "Sales"


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ──────────────────────────────────────────
# Lead Schemas
# ──────────────────────────────────────────

class LeadCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    property_type: Optional[str] = None
    location: Optional[str] = None
    budget: Optional[str] = None
    timeline: Optional[str] = None


class LeadUpdate(BaseModel):
    status: Optional[str] = None
    score: Optional[int] = None
    score_category: Optional[str] = None
    property_type: Optional[str] = None
    budget: Optional[str] = None
    timeline: Optional[str] = None


class LeadOut(BaseModel):
    id: str
    name: str
    phone: str
    email: Optional[str]
    property_type: Optional[str]
    location: Optional[str]
    budget: Optional[str]
    timeline: Optional[str]
    score: int
    score_category: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ──────────────────────────────────────────
# Call Schemas
# ──────────────────────────────────────────

class CallOut(BaseModel):
    id: str
    lead_id: Optional[str]
    duration_seconds: int
    caller_phone: Optional[str]
    ai_summary: Optional[str]
    ai_intent: Optional[str]
    score_at_call: Optional[int]
    category: Optional[str]
    created_at: datetime
    lead_name: Optional[str] = None
    lead_location: Optional[str] = None
    lead_budget: Optional[str] = None

    class Config:
        from_attributes = True


# ──────────────────────────────────────────
# Appointment Schemas
# ──────────────────────────────────────────

class AppointmentCreate(BaseModel):
    lead_id: str
    slot_datetime: datetime
    type: str = "Site Visit"
    notes: Optional[str] = None
    property_id: Optional[str] = None


class AppointmentUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class AppointmentOut(BaseModel):
    id: str
    lead_id: Optional[str]
    slot_datetime: datetime
    type: str
    status: str
    notes: Optional[str]
    property_id: Optional[str]
    created_at: datetime
    lead_name: Optional[str] = None
    lead_phone: Optional[str] = None
    property_name: Optional[str] = None

    class Config:
        from_attributes = True


# ──────────────────────────────────────────
# Property Schemas
# ──────────────────────────────────────────

class PropertyCreate(BaseModel):
    name: str
    location: str
    type: str
    price: str
    sqft: Optional[str] = None
    builder: Optional[str] = None
    amenities: Optional[List[str]] = []
    status: Optional[str] = "Available"
    description: Optional[str] = None


class PropertyOut(BaseModel):
    id: str
    name: str
    location: str
    type: str
    price: str
    sqft: Optional[str]
    builder: Optional[str]
    amenities: List[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ──────────────────────────────────────────
# Settings Schemas
# ──────────────────────────────────────────

class SettingsUpdate(BaseModel):
    agent_name: Optional[str] = None
    voice_model: Optional[str] = None
    temperature: Optional[float] = None
    system_prompt: Optional[str] = None
    qualify_budget: Optional[bool] = None
    auto_site_visit: Optional[bool] = None
    whatsapp_followup: Optional[bool] = None


class SettingsOut(BaseModel):
    id: int
    agent_name: str
    voice_model: str
    temperature: float
    system_prompt: Optional[str]
    qualify_budget: bool
    auto_site_visit: bool
    whatsapp_followup: bool

    class Config:
        from_attributes = True


# ──────────────────────────────────────────
# Analytics Schemas
# ──────────────────────────────────────────

class AnalyticsSummary(BaseModel):
    total_calls: int
    total_leads: int
    hot_leads: int
    warm_leads: int
    cold_leads: int
    site_visits_scheduled: int
    conversion_rate: float
    ai_answer_rate: float = 100.0
