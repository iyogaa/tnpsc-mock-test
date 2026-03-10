from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models.database import get_db, User, ExamSession, ExamStatus, MockTest
from models.schemas import SaveAnswerRequest, MarkReviewRequest, TabSwitchRequest, StartExamResponse
from services.exam_service import (
    create_exam_session, build_exam_questions, save_answer,
    mark_review, record_tab_switch, calculate_and_submit, update_time
)
from services.email_service import send_result_email
from services.pdf_service import generate_result_pdf
from routers.auth import get_current_user
from typing import Optional

router = APIRouter(prefix="/exam", tags=["exam"])

@router.get("/tests")
def list_tests(db: Session = Depends(get_db)):
    tests = db.query(MockTest).filter(MockTest.is_active == True).all()
    return [{"id": t.id, "title": t.title, "description": t.description,
             "duration_minutes": t.duration_minutes,
             "total_questions": t.tamil_count + t.gs_count + t.aptitude_count} for t in tests]

@router.post("/start/{mock_test_id}")
def start_exam(mock_test_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        session = create_exam_session(db, user.id, mock_test_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    questions = build_exam_questions(db, session.mock_test, session)
    return {
        "session_id": session.id,
        "mock_test_title": session.mock_test.title,
        "duration_minutes": session.mock_test.duration_minutes,
        "total_questions": len(questions),
        "time_remaining_seconds": session.time_remaining_seconds,
        "questions": questions,
        "answers": session.answers or {},
        "marked_for_review": session.marked_for_review or [],
        "tab_switch_count": session.tab_switch_count or 0,
    }

@router.get("/session/{session_id}")
def get_session(session_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(ExamSession).filter(
        ExamSession.id == session_id, ExamSession.user_id == user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session.id,
        "status": session.status.value,
        "answers": session.answers or {},
        "marked_for_review": session.marked_for_review or [],
        "time_remaining_seconds": session.time_remaining_seconds,
        "tab_switch_count": session.tab_switch_count or 0,
    }

@router.post("/answer")
def answer(req: SaveAnswerRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ok = save_answer(db, req.session_id, user.id, req.question_id, req.selected_option)
    if not ok:
        raise HTTPException(status_code=400, detail="Cannot save answer")
    return {"saved": True}

@router.post("/review")
def toggle_review(req: MarkReviewRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ok = mark_review(db, req.session_id, user.id, req.question_id, req.marked)
    return {"updated": ok}

@router.post("/sync-time")
def sync_time(session_id: int, time_remaining: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    update_time(db, session_id, user.id, time_remaining)
    return {"synced": True}

@router.post("/tab-switch")
def tab_switch(req: TabSwitchRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    count = record_tab_switch(db, req.session_id, user.id)
    return {"tab_switch_count": count, "auto_submit": count >= 5}

@router.post("/submit/{session_id}")
def submit(session_id: int, auto: bool = False, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = calculate_and_submit(db, session_id, user.id, auto)
    if not result:
        raise HTTPException(status_code=400, detail="Cannot submit exam")
    # Send email
    try:
        pdf = generate_result_pdf(user.name, user.email, result)
        send_result_email(user.email, user.name, result, pdf)
        session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
        if session:
            session.result_emailed = True
            db.commit()
    except Exception as e:
        print(f"[POST-SUBMIT ERROR] {e}")
    return result

@router.get("/result/{session_id}")
def get_result(session_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(ExamSession).filter(
        ExamSession.id == session_id, ExamSession.user_id == user.id
    ).first()
    if not session or session.status not in [ExamStatus.submitted, ExamStatus.expired]:
        raise HTTPException(status_code=404, detail="Result not available")
    result = calculate_and_submit.__wrapped__ if hasattr(calculate_and_submit, '__wrapped__') else None
    # Return stored result
    return {
        "session_id": session_id,
        "score": session.score,
        "total_marks": session.mock_test.tamil_count + session.mock_test.gs_count * 2 + session.mock_test.aptitude_count * 2,
        "percentage": round((session.score / (session.mock_test.tamil_count + session.mock_test.gs_count * 2 + session.mock_test.aptitude_count * 2)) * 100, 2),
        "total_correct": session.total_correct,
        "total_wrong": session.total_wrong,
        "total_unanswered": session.total_unanswered,
        "section_scores": session.section_scores,
    }

@router.get("/leaderboard/{mock_test_id}")
def leaderboard(mock_test_id: int, db: Session = Depends(get_db)):
    sessions = db.query(ExamSession).filter(
        ExamSession.mock_test_id == mock_test_id,
        ExamSession.status.in_([ExamStatus.submitted, ExamStatus.expired]),
        ExamSession.score.isnot(None)
    ).order_by(ExamSession.score.desc()).limit(50).all()
    result = []
    for rank, s in enumerate(sessions, 1):
        total = s.mock_test.tamil_count + s.mock_test.gs_count * 2 + s.mock_test.aptitude_count * 2
        result.append({
            "rank": rank, "name": s.user.name,
            "score": s.score, "total": total,
            "percentage": round((s.score / total) * 100, 2) if total else 0,
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
        })
    return result

@router.get("/my-history")
def my_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = db.query(ExamSession).filter(
        ExamSession.user_id == user.id,
        ExamSession.status.in_([ExamStatus.submitted, ExamStatus.expired])
    ).order_by(ExamSession.created_at.desc()).all()
    result = []
    for s in sessions:
        total = s.mock_test.tamil_count + s.mock_test.gs_count * 2 + s.mock_test.aptitude_count * 2
        result.append({
            "session_id": s.id,
            "mock_test_title": s.mock_test.title,
            "score": s.score, "total": total,
            "percentage": round((s.score / total) * 100, 2) if total else 0,
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
        })
    return result
