from sqlalchemy import create_engine, Column, Integer, String, Boolean, Float, DateTime, Text, ForeignKey, JSON, Enum
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker
from sqlalchemy.sql import func
import enum
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tnpsc.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

class UserRole(str, enum.Enum):
    candidate = "candidate"
    admin = "admin"

class Difficulty(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"

class Subject(str, enum.Enum):
    tamil = "Tamil"
    general_studies = "General Studies"
    aptitude = "Aptitude & Mental Ability"

class ExamStatus(str, enum.Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    submitted = "submitted"
    expired = "expired"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(200), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.candidate)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    exam_sessions = relationship("ExamSession", back_populates="user")

class QuestionSet(Base):
    __tablename__ = "question_sets"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    questions = relationship("Question", back_populates="question_set")
    mock_tests = relationship("MockTest", back_populates="question_set")

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    question_set_id = Column(Integer, ForeignKey("question_sets.id"), nullable=False)
    subject = Column(Enum(Subject), nullable=False)
    question_text = Column(Text, nullable=False)
    option_a = Column(Text, nullable=False)
    option_b = Column(Text, nullable=False)
    option_c = Column(Text, nullable=False)
    option_d = Column(Text, nullable=False)
    correct_option = Column(String(1), nullable=False)  # A/B/C/D
    explanation = Column(Text)
    difficulty = Column(Enum(Difficulty), default=Difficulty.medium)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    question_set = relationship("QuestionSet", back_populates="questions")

class MockTest(Base):
    __tablename__ = "mock_tests"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    question_set_id = Column(Integer, ForeignKey("question_sets.id"), nullable=False)
    duration_minutes = Column(Integer, default=180)
    tamil_count = Column(Integer, default=100)
    gs_count = Column(Integer, default=75)
    aptitude_count = Column(Integer, default=25)
    randomize_questions = Column(Boolean, default=True)
    randomize_options = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    question_set = relationship("QuestionSet", back_populates="mock_tests")
    exam_sessions = relationship("ExamSession", back_populates="mock_test")

class ExamSession(Base):
    __tablename__ = "exam_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mock_test_id = Column(Integer, ForeignKey("mock_tests.id"), nullable=False)
    status = Column(Enum(ExamStatus), default=ExamStatus.not_started)
    questions_order = Column(JSON)  # List of question IDs in display order
    option_map = Column(JSON)       # Per-question option shuffle map
    answers = Column(JSON, default={})  # {question_id: selected_option}
    marked_for_review = Column(JSON, default=[])
    started_at = Column(DateTime(timezone=True))
    submitted_at = Column(DateTime(timezone=True))
    time_remaining_seconds = Column(Integer)
    tab_switch_count = Column(Integer, default=0)
    score = Column(Float)
    total_correct = Column(Integer)
    total_wrong = Column(Integer)
    total_unanswered = Column(Integer)
    section_scores = Column(JSON)
    result_emailed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User", back_populates="exam_sessions")
    mock_test = relationship("MockTest", back_populates="exam_sessions")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
