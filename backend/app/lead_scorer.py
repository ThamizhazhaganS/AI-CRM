"""
Lead Qualification Engine
━━━━━━━━━━━━━━━━━━━━━━━━
Scores an incoming lead based on conversation signals extracted
by the AI voice pipeline. Returns a numeric score and category.

Scoring rules:
  Budget confirmed          → +30 pts
  Timeline < 3 months       → +25 pts
  Site visit requested      → +25 pts
  Email provided            → +10 pts
  Property type specified   → +10 pts
  ─────────────────────────────────
  Max possible score: 100

Categories:
  ≥ 80  → Hot   🔥
  50-79 → Warm  ⚡
  < 50  → Cold  ❄️
"""

from app import models


def calculate_lead_score(
    budget: str | None,
    timeline: str | None,
    site_visit_requested: bool = False,
    email: str | None = None,
    property_type: str | None = None,
) -> tuple[int, models.LeadCategory]:
    """
    Calculates a lead score based on conversation signals.
    Returns (score: int, category: LeadCategory)
    """
    score = 0

    # +30: Budget provided and not vague
    if budget and budget.strip() and budget.lower() not in ("", "unknown", "not sure"):
        score += 30

    # +25: Timeline within 3 months
    if timeline:
        urgent_keywords = ["immediate", "1 month", "2 months", "1-2 months", "asap", "now"]
        if any(kw in timeline.lower() for kw in urgent_keywords):
            score += 25
        elif "3 months" in timeline.lower() or "3-6 months" in timeline.lower():
            score += 12  # Partial score for moderate urgency

    # +25: Site visit explicitly requested
    if site_visit_requested:
        score += 25

    # +10: Email captured (intent to follow up)
    if email and "@" in email:
        score += 10

    # +10: Property type specified (not browsing)
    if property_type and property_type.strip():
        score += 10

    # Cap at 100
    score = min(score, 100)

    # Assign category
    if score >= 80:
        category = models.LeadCategory.hot
    elif score >= 50:
        category = models.LeadCategory.warm
    else:
        category = models.LeadCategory.cold

    return score, category


def score_lead_from_db(lead: models.Lead) -> tuple[int, models.LeadCategory]:
    """
    Re-scores an existing lead record from its stored fields.
    Useful for batch re-scoring after scoring rule changes.
    """
    return calculate_lead_score(
        budget=lead.budget,
        timeline=lead.timeline,
        site_visit_requested=lead.status == models.LeadStatus.site_visit_scheduled,
        email=lead.email,
        property_type=lead.property_type,
    )
