from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models.database import init_db, get_db, User, UserRole, QuestionSet, MockTest
from services.auth_service import create_user, get_user_by_email
from routers import auth, exam, admin
import os

app = FastAPI(
    title="TNPSC Group 4 Mock Test API",
    description="Production-grade exam platform for TNPSC aspirants",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Set specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(exam.router)
app.include_router(admin.router)

@app.on_event("startup")
async def startup():
    init_db()
    # Seed admin user
    from sqlalchemy.orm import Session
    from models.database import SessionLocal
    db: Session = SessionLocal()
    try:
        admin_email = os.getenv("ADMIN_EMAIL", "admin@tnpsc.com")
        admin_pass = os.getenv("ADMIN_PASS", "Admin@123")
        if not get_user_by_email(db, admin_email):
            create_user(db, "Admin", admin_email, admin_pass, UserRole.admin)
            print(f"[STARTUP] Admin created: {admin_email}")
        
        # Seed a default mock test if none exist
        if db.query(MockTest).count() == 0:
            qs = QuestionSet(name="Default Question Set", description="Upload questions via Admin Panel → Question Sets")
            db.add(qs)
            db.commit()
            db.refresh(qs)
            mt = MockTest(
                title="TNPSC Group 4 – Full Mock Test 1",
                description="Complete 200-question mock test following official TNPSC Group 4 pattern",
                question_set_id=qs.id,
                duration_minutes=180,
                tamil_count=100,
                gs_count=75,
                aptitude_count=25,
                randomize_questions=True,
                randomize_options=False,
                is_active=True,
            )
            db.add(mt)
            db.commit()
            print("[STARTUP] Default mock test created")
    finally:
        db.close()

@app.get("/")
def root():
    return {"message": "TNPSC Group 4 Mock Test API v2.0", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok"}
