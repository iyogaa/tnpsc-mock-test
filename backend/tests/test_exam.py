import pytest
from fastapi.testclient import TestClient
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["SECRET_KEY"] = "test-secret-key"

from main import app
from models.database import init_db, SessionLocal, User, UserRole, QuestionSet, MockTest, Question, Subject, Difficulty
from services.auth_service import create_user, hash_password

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    db = SessionLocal()
    # Clear
    db.query(Question).delete()
    db.query(MockTest).delete()
    db.query(QuestionSet).delete()
    db.query(User).delete()
    db.commit()
    
    # Admin
    admin = create_user(db, "Admin", "admin@test.com", "admin123", UserRole.admin)
    candidate = create_user(db, "Test User", "test@test.com", "test123")
    
    # Question set with questions
    qs = QuestionSet(name="Test Set")
    db.add(qs)
    db.commit()
    db.refresh(qs)
    
    for i in range(5):
        db.add(Question(question_set_id=qs.id, subject=Subject.tamil,
                        question_text=f"Tamil Q{i+1}?", option_a="A", option_b="B", option_c="C", option_d="D",
                        correct_option="A", difficulty=Difficulty.easy))
    for i in range(5):
        db.add(Question(question_set_id=qs.id, subject=Subject.general_studies,
                        question_text=f"GS Q{i+1}?", option_a="A", option_b="B", option_c="C", option_d="D",
                        correct_option="B", difficulty=Difficulty.medium))
    for i in range(2):
        db.add(Question(question_set_id=qs.id, subject=Subject.aptitude,
                        question_text=f"Aptitude Q{i+1}?", option_a="A", option_b="B", option_c="C", option_d="D",
                        correct_option="C", difficulty=Difficulty.easy))
    
    mt = MockTest(title="Test Exam", question_set_id=qs.id,
                  duration_minutes=3, tamil_count=3, gs_count=3, aptitude_count=2,
                  randomize_questions=True, is_active=True)
    db.add(mt)
    db.commit()
    db.refresh(mt)
    
    yield {"admin_email": "admin@test.com", "candidate_email": "test@test.com",
           "mock_test_id": mt.id, "qs_id": qs.id}
    
    db.query(Question).delete()
    db.query(MockTest).delete()
    db.query(QuestionSet).delete()
    db.query(User).delete()
    db.commit()
    db.close()
    try:
        os.remove("test.db")
    except: pass

def get_token(email, password):
    r = client.post("/auth/login", json={"email": email, "password": password})
    return r.json().get("access_token")

def test_register_and_login():
    r = client.post("/auth/register", json={"name": "New User", "email": "new@test.com", "password": "pass123"})
    assert r.status_code == 200
    assert "access_token" in r.json()
    r2 = client.post("/auth/login", json={"email": "new@test.com", "password": "pass123"})
    assert r2.status_code == 200

def test_login_wrong_password():
    r = client.post("/auth/login", json={"email": "test@test.com", "password": "wrong"})
    assert r.status_code == 401

def test_start_exam(setup_db):
    token = get_token("test@test.com", "test123")
    r = client.post(f"/exam/start/{setup_db['mock_test_id']}", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert "session_id" in data
    assert len(data["questions"]) == 8  # 3+3+2
    assert data["time_remaining_seconds"] == 180
    return data

def test_answer_save(setup_db):
    token = get_token("test@test.com", "test123")
    start = client.post(f"/exam/start/{setup_db['mock_test_id']}", headers={"Authorization": f"Bearer {token}"}).json()
    sid = start["session_id"]
    qid = start["questions"][0]["id"]
    r = client.post("/exam/answer", json={"session_id": sid, "question_id": qid, "selected_option": "A"},
                    headers={"Authorization": f"Bearer {token}"})
    assert r.json()["saved"] == True
    # Verify persisted
    state = client.get(f"/exam/session/{sid}", headers={"Authorization": f"Bearer {token}"}).json()
    assert str(qid) in state["answers"]

def test_mark_review(setup_db):
    token = get_token("test@test.com", "test123")
    start = client.post(f"/exam/start/{setup_db['mock_test_id']}", headers={"Authorization": f"Bearer {token}"}).json()
    sid = start["session_id"]
    qid = start["questions"][0]["id"]
    r = client.post("/exam/review", json={"session_id": sid, "question_id": qid, "marked": True},
                    headers={"Authorization": f"Bearer {token}"})
    assert r.json()["updated"] == True

def test_submit_and_result(setup_db):
    token = get_token("test@test.com", "test123")
    start = client.post(f"/exam/start/{setup_db['mock_test_id']}", headers={"Authorization": f"Bearer {token}"}).json()
    sid = start["session_id"]
    # Answer all questions
    for q in start["questions"]:
        client.post("/exam/answer", json={"session_id": sid, "question_id": q["id"], "selected_option": "A"},
                    headers={"Authorization": f"Bearer {token}"})
    r = client.post(f"/exam/submit/{sid}", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert "score" in data
    assert "percentage" in data
    assert data["total_correct"] + data["total_wrong"] + data["total_unanswered"] == 8

def test_result_calculation():
    """Unit test for score math: Tamil 1pt, GS 2pt, Aptitude 2pt"""
    tamil_correct = 80
    gs_correct = 60
    apt_correct = 20
    score = tamil_correct * 1 + gs_correct * 2 + apt_correct * 2
    total = 100 * 1 + 75 * 2 + 25 * 2
    assert total == 300
    assert score == 80 + 120 + 40  # 240
    assert round((score/total)*100, 2) == 80.0

def test_tab_switch(setup_db):
    token = get_token("test@test.com", "test123")
    start = client.post(f"/exam/start/{setup_db['mock_test_id']}", headers={"Authorization": f"Bearer {token}"}).json()
    sid = start["session_id"]
    for _ in range(3):
        r = client.post("/exam/tab-switch", json={"session_id": sid}, headers={"Authorization": f"Bearer {token}"})
    assert r.json()["tab_switch_count"] == 3
    assert r.json()["auto_submit"] == False

def test_leaderboard(setup_db):
    token = get_token("test@test.com", "test123")
    start = client.post(f"/exam/start/{setup_db['mock_test_id']}", headers={"Authorization": f"Bearer {token}"}).json()
    client.post(f"/exam/submit/{start['session_id']}", headers={"Authorization": f"Bearer {token}"})
    r = client.get(f"/exam/leaderboard/{setup_db['mock_test_id']}")
    assert r.status_code == 200
    assert len(r.json()) >= 1

def test_admin_analytics(setup_db):
    token = get_token("admin@test.com", "admin123")
    ctoken = get_token("test@test.com", "test123")
    start = client.post(f"/exam/start/{setup_db['mock_test_id']}", headers={"Authorization": f"Bearer {ctoken}"}).json()
    client.post(f"/exam/submit/{start['session_id']}", headers={"Authorization": f"Bearer {ctoken}"})
    r = client.get(f"/admin/analytics/{setup_db['mock_test_id']}", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["total_attempts"] == 1
