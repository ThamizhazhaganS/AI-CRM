from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, leads, calls, appointments, properties, settings, voice, voice_agent

# Create all database tables on startup
Base.metadata.create_all(bind=engine)

# Seed default database values
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models
from app.auth_utils import hash_password

def seed_db():
    db: Session = SessionLocal()
    try:
        # Seed users if empty
        if db.query(models.User).count() == 0:
            print("Seeding default users...")
            admin = models.User(
                name="Amit Patel",
                email="admin@estateai.com",
                hashed_password=hash_password("admin123"),
                role=models.UserRole.admin
            )
            manager = models.User(
                name="Suresh Kumar",
                email="manager@estateai.com",
                hashed_password=hash_password("manager123"),
                role=models.UserRole.manager
            )
            sales = models.User(
                name="Kavitha Raj",
                email="sales@estateai.com",
                hashed_password=hash_password("sales123"),
                role=models.UserRole.sales
            )
            db.add_all([admin, manager, sales])
            
        # Seed properties if empty
        if db.query(models.Property).count() == 0:
            print("Seeding default properties...")
            p1 = models.Property(
                id="PROP-101",
                name="Prestige Lakeside Habitat",
                location="OMR, Chennai",
                type=models.PropertyType.apartment,
                price="₹85 Lakhs",
                sqft="1250 Sqft",
                builder="Prestige Group",
                amenities=["Swimming Pool", "Gym", "Clubhouse", "24/7 Security"],
                status=models.PropertyStatus.available,
                description="Luxurious 2 BHK apartment overlooking the lake with premium fittings and smart automation."
            )
            p2 = models.Property(
                id="PROP-102",
                name="Casagrand ECR Villas",
                location="ECR, Chennai",
                type=models.PropertyType.villa,
                price="₹2.4 Cr",
                sqft="2800 Sqft",
                builder="Casagrand",
                amenities=["Private Garden", "Swimming Pool", "Power Backup", "Gym"],
                status=models.PropertyStatus.available,
                description="Stunning 4 BHK independent villa close to the beach, featuring modern architectural designs and landscaped garden."
            )
            p3 = models.Property(
                id="PROP-103",
                name="Greenfield Plots",
                location="Guduvanchery",
                type=models.PropertyType.plot,
                price="₹45 Lakhs",
                sqft="2400 Sqft",
                builder="Greenfield Developers",
                amenities=["Paved Roads", "Street Lights", "Water Connection"],
                status=models.PropertyStatus.few_left,
                description="Ready-to-construct residential plot in a fast-developing gated community."
            )
            p4 = models.Property(
                id="PROP-104",
                name="Brigade Tech Park Offices",
                location="Perungudi, Chennai",
                type=models.PropertyType.commercial,
                price="₹1.8 Cr",
                sqft="3200 Sqft",
                builder="Brigade Group",
                amenities=["Dedicated Parking", "High-Speed Internet", "24/7 Access", "Power Backup"],
                status=models.PropertyStatus.few_left,
                description="Grade-A commercial office space in the heart of Chennai's IT corridor."
            )
            db.add_all([p1, p2, p3, p4])

        # Seed system settings if empty
        if db.query(models.SystemSettings).count() == 0:
            print("Seeding default system settings...")
            settings_obj = models.SystemSettings(
                id=1,
                agent_name="EstateAI Receptionist",
                voice_model="eleven_rachel",
                temperature=0.3,
                system_prompt="""You are a virtual receptionist for a premier real estate firm. Your goal is to:
1. Warmly greet callers and identify their inquiry type.
2. Ask questions to capture location, budget, configuration (2BHK, 3BHK, Plot, Commercial), and purchase timeline.
3. Reference the company property directory to answer specific property queries.
4. Pitch and schedule physical site visits for Sunday afternoon.
5. Remain polite, professional, and do not make up pricing details.""",
                qualify_budget=True,
                auto_site_visit=True,
                whatsapp_followup=True
            )
            db.add(settings_obj)

        # Seed demo leads if empty
        if db.query(models.Lead).count() == 0:
            print("Seeding demo leads, calls, and appointments...")
            from datetime import datetime, timedelta

            demo_leads = [
                models.Lead(id="C-9001", name="Rohan Sharma", phone="+91 98765 43210", email="rohan.s@gmail.com",
                    property_type="Apartment", location="OMR, Chennai", budget="₹80–95 Lakhs", timeline="3 months",
                    score=92, score_category=models.LeadCategory.hot, status=models.LeadStatus.site_visit_scheduled),
                models.Lead(id="C-9002", name="Sanjay Singhania", phone="+91 98840 98765", email="sanjay.s@techfirm.in",
                    property_type="Villa", location="ECR, Chennai", budget="₹2–3 Cr", timeline="Immediate",
                    score=95, score_category=models.LeadCategory.hot, status=models.LeadStatus.site_visit_scheduled),
                models.Lead(id="C-9003", name="Meera Krishnan", phone="+91 95000 12345", email="meera.k@outlook.com",
                    property_type="Apartment", location="Velachery, Chennai", budget="₹60–75 Lakhs", timeline="6 months",
                    score=72, score_category=models.LeadCategory.warm, status=models.LeadStatus.callback_requested),
                models.Lead(id="C-9004", name="Ananya Iyer", phone="+91 91234 56789", email="ananya.iyer@yahoo.com",
                    property_type="Apartment", location="Anna Nagar, Chennai", budget="₹1–1.2 Cr", timeline="2 months",
                    score=88, score_category=models.LeadCategory.hot, status=models.LeadStatus.callback_requested),
                models.Lead(id="C-9005", name="Vikram Nair", phone="+91 70000 55433", email="vikram.nair@infosys.com",
                    property_type="Plot", location="Guduvanchery", budget="₹40–50 Lakhs", timeline="1 year",
                    score=45, score_category=models.LeadCategory.cold, status=models.LeadStatus.call_completed),
                models.Lead(id="C-9006", name="Priya Venkat", phone="+91 80093 22010", email="priya.v@gmail.com",
                    property_type="Villa", location="Sholinganallur, Chennai", budget="₹1.8–2.5 Cr", timeline="3 months",
                    score=84, score_category=models.LeadCategory.hot, status=models.LeadStatus.call_completed),
                models.Lead(id="C-9007", name="Karthik Rajan", phone="+91 99440 00311", email=None,
                    property_type="Commercial Office", location="Perungudi, Chennai", budget="₹1.5–2 Cr", timeline="6 months",
                    score=61, score_category=models.LeadCategory.warm, status=models.LeadStatus.new),
                models.Lead(id="C-9008", name="Divya Murugan", phone="+91 94440 76521", email="divya.m@wipro.com",
                    property_type="Apartment", location="OMR, Chennai", budget="₹70–80 Lakhs", timeline="4 months",
                    score=77, score_category=models.LeadCategory.warm, status=models.LeadStatus.call_completed),
                models.Lead(id="C-9009", name="Arun Balaji", phone="+91 87654 32100", email=None,
                    property_type="Plot", location="Sriperumbudur", budget="₹25–35 Lakhs", timeline="Browsing",
                    score=28, score_category=models.LeadCategory.cold, status=models.LeadStatus.new),
                models.Lead(id="C-9010", name="Lakshmi Sundaram", phone="+91 99887 12345", email="lakshmi.s@tcs.com",
                    property_type="Apartment", location="Adyar, Chennai", budget="₹1.1–1.3 Cr", timeline="2 months",
                    score=91, score_category=models.LeadCategory.hot, status=models.LeadStatus.site_visit_scheduled),
                models.Lead(id="C-9011", name="Rajesh Kumar", phone="+91 75300 88421", email="rajesh.k@outlook.com",
                    property_type="Villa", location="ECR, Chennai", budget="₹2.8–3.5 Cr", timeline="Immediate",
                    score=97, score_category=models.LeadCategory.hot, status=models.LeadStatus.converted),
                models.Lead(id="C-9012", name="Nithya Gopal", phone="+91 98000 44123", email=None,
                    property_type="Apartment", location="Tambaram", budget="₹45–55 Lakhs", timeline="1 year",
                    score=38, score_category=models.LeadCategory.cold, status=models.LeadStatus.lost),
            ]
            db.add_all(demo_leads)
            db.flush()

            # Demo Calls
            from datetime import datetime, timedelta
            demo_calls = [
                models.Call(id="CALL-001", lead_id="C-9001", duration_seconds=245, caller_phone="+91 98765 43210",
                    ai_summary="Caller inquired about 2BHK in OMR. Budget is ₹80–95 Lakhs. Ready to buy in 3 months. Site visit booked for Sunday.",
                    ai_intent="Site Visit Scheduling", score_at_call=92, category=models.LeadCategory.hot,
                    created_at=datetime.utcnow() - timedelta(days=2)),
                models.Call(id="CALL-002", lead_id="C-9002", duration_seconds=310, caller_phone="+91 98840 98765",
                    ai_summary="High-intent caller asking about ECR villas. Budget above 2Cr. Wants to visit next weekend.",
                    ai_intent="Site Visit Scheduling", score_at_call=95, category=models.LeadCategory.hot,
                    created_at=datetime.utcnow() - timedelta(days=1)),
                models.Call(id="CALL-003", lead_id="C-9003", duration_seconds=180, caller_phone="+91 95000 12345",
                    ai_summary="Caller asked about 2BHK options. Budget moderate. Requested a callback in 2 days.",
                    ai_intent="Callback Request", score_at_call=72, category=models.LeadCategory.warm,
                    created_at=datetime.utcnow() - timedelta(days=3)),
                models.Call(id="CALL-004", lead_id="C-9004", duration_seconds=195, caller_phone="+91 91234 56789",
                    ai_summary="Interested in Anna Nagar premium apartments. Budget 1.2Cr. Timeline 2 months. Warm lead.",
                    ai_intent="Pricing Enquiry", score_at_call=88, category=models.LeadCategory.hot,
                    created_at=datetime.utcnow() - timedelta(hours=18)),
                models.Call(id="CALL-005", lead_id="C-9006", duration_seconds=278, caller_phone="+91 80093 22010",
                    ai_summary="Enquiry about Sholinganallur villas. Ready to invest 2Cr. Needs detailed brochure.",
                    ai_intent="Brochure Request", score_at_call=84, category=models.LeadCategory.hot,
                    created_at=datetime.utcnow() - timedelta(hours=6)),
                models.Call(id="CALL-006", lead_id="C-9005", duration_seconds=65, caller_phone="+91 70000 55433",
                    ai_summary="Browsing stage. Not ready to commit. Preferred a follow-up in 6 months.",
                    ai_intent="General Inquiry", score_at_call=45, category=models.LeadCategory.cold,
                    created_at=datetime.utcnow() - timedelta(days=5)),
                models.Call(id="CALL-007", lead_id="C-9010", duration_seconds=322, caller_phone="+91 99887 12345",
                    ai_summary="High-budget Adyar enquiry. Asking about 3BHK with sea view. Very serious buyer.",
                    ai_intent="Site Visit Scheduling", score_at_call=91, category=models.LeadCategory.hot,
                    created_at=datetime.utcnow() - timedelta(hours=2)),
                models.Call(id="CALL-008", lead_id="C-9008", duration_seconds=220, caller_phone="+91 94440 76521",
                    ai_summary="Warm lead asking about OMR apartments. Shortlisted 2 options. Needs pricing comparison.",
                    ai_intent="Pricing Enquiry", score_at_call=77, category=models.LeadCategory.warm,
                    created_at=datetime.utcnow() - timedelta(hours=30)),
            ]
            db.add_all(demo_calls)

            # Demo Appointments
            demo_appointments = [
                models.Appointment(id="APT-001", lead_id="C-9001",
                    slot_datetime=datetime.utcnow() + timedelta(days=3, hours=3),
                    type=models.AppointmentType.site_visit, status=models.AppointmentStatus.approved,
                    property_id="PROP-101", notes="Interested in lake-facing units only."),
                models.Appointment(id="APT-002", lead_id="C-9002",
                    slot_datetime=datetime.utcnow() + timedelta(days=3, hours=6),
                    type=models.AppointmentType.site_visit, status=models.AppointmentStatus.approved,
                    property_id="PROP-102", notes="High-intent buyer, arrange for Director of Sales to attend."),
                models.Appointment(id="APT-003", lead_id="C-9003",
                    slot_datetime=datetime.utcnow() + timedelta(days=1, hours=4),
                    type=models.AppointmentType.callback, status=models.AppointmentStatus.pending,
                    property_id=None, notes="Call back between 2–4 PM. Prefers Tamil."),
                models.Appointment(id="APT-004", lead_id="C-9010",
                    slot_datetime=datetime.utcnow() + timedelta(days=3, hours=8),
                    type=models.AppointmentType.site_visit, status=models.AppointmentStatus.pending,
                    property_id="PROP-101", notes="Premium Adyar buyer — priority slot."),
            ]
            db.add_all(demo_appointments)

        db.commit()
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

seed_db()

app = FastAPI(
    title="EstateAI Receptionist — Backend API",
    description="Production-ready API powering the AI Virtual Receptionist CRM for real estate companies.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Allow Next.js frontend to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers
app.include_router(auth.router)
app.include_router(leads.router)
app.include_router(calls.router)
app.include_router(appointments.router)
app.include_router(properties.router)
app.include_router(settings.router)
app.include_router(voice.router)
app.include_router(voice_agent.router)


@app.get("/", tags=["Health"])
def root():
    return {
        "service": "EstateAI Receptionist API",
        "status": "online",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}
