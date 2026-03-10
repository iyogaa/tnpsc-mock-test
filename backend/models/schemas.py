from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    candidate = "candidate"
    admin = "admin"

class Subject(str, Enum):
    tamil = "Tamil"
    general_studies = "General Studies"
    aptitude = "Aptitude & Mental Ability"

class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"

class ExamStatus(str, Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    submitted = "submitted"
    expired = "expired"

# Auth
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    created_at: datetime
    model_config = {"from_attributes": True}

# Questions
class QuestionCreate(BaseModel):
    question_set_id: int
    subject: Subject
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str
    explanation: Optional[str] = None
    difficulty: Difficulty = Difficulty.medium

    @field_validator("correct_option")
    @classmethod
    def validate_option(cls, v):
        if v.upper() not in ["A", "B", "C", "D"]:
            raise ValueError("correct_option must be A, B, C, or D")
        return v.upper()

class QuestionOut(BaseModel):
    id: int
    subject: Subject
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str
    explanation: Optional[str]
    difficulty: Difficulty
    model_config = {"from_attributes": True}

class QuestionSetCreate(BaseModel):
    name: str
    description: Optional[str] = None

class QuestionSetOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    question_count: Optional[int] = 0
    model_config = {"from_attributes": True}

# Mock Test
class MockTestCreate(BaseModel):
    title: str
    description: Optional[str] = None
    question_set_id: int
    duration_minutes: int = 180
    tamil_count: int = 100
    gs_count: int = 75
    aptitude_count: int = 25
    randomize_questions: bool = True
    randomize_options: bool = False

class MockTestOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    duration_minutes: int
    tamil_count: int
    gs_count: int
    aptitude_count: int
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}

# Exam Session
class StartExamResponse(BaseModel):
    session_id: int
    mock_test_title: str
    duration_minutes: int
    total_questions: int
    time_remaining_seconds: int
    questions: List[Dict[str, Any]]

class SaveAnswerRequest(BaseModel):
    session_id: int
    question_id: int
    selected_option: Optional[str] = None  # None to clear

class MarkReviewRequest(BaseModel):
    session_id: int
    question_id: int
    marked: bool

class TabSwitchRequest(BaseModel):
    session_id: int

class SessionStateResponse(BaseModel):
    session_id: int
    status: ExamStatus
    answers: Dict[str, Any]
    marked_for_review: List[int]
    time_remaining_seconds: int
    tab_switch_count: int

class SubmitExamResponse(BaseModel):
    session_id: int
    score: float
    total_marks: int
    percentage: float
    total_correct: int
    total_wrong: int
    total_unanswered: int
    section_scores: Dict[str, Any]
    rank: Optional[int] = None
    detailed_results: List[Dict[str, Any]]

class LeaderboardEntry(BaseModel):
    rank: int
    name: str
    score: float
    percentage: float
    submitted_at: datetime
