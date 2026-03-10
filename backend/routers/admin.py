from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from models.database import get_db, User, Question, QuestionSet, MockTest, ExamSession, ExamStatus, Subject, Difficulty
from models.schemas import QuestionSetCreate, QuestionSetOut, MockTestCreate, MockTestOut
from routers.auth import require_admin
import pandas as pd
import io
from typing import Optional

router = APIRouter(prefix="/admin", tags=["admin"])

# Question Sets
@router.get("/question-sets")
def list_sets(db: Session = Depends(get_db), _=Depends(require_admin)):
    sets = db.query(QuestionSet).all()
    result = []
    for s in sets:
        result.append({
            "id": s.id, "name": s.name, "description": s.description,
            "is_active": s.is_active, "created_at": s.created_at.isoformat(),
            "question_count": db.query(Question).filter(Question.question_set_id == s.id).count(),
            "tamil_count": db.query(Question).filter(Question.question_set_id == s.id, Question.subject == Subject.tamil).count(),
            "gs_count": db.query(Question).filter(Question.question_set_id == s.id, Question.subject == Subject.general_studies).count(),
            "aptitude_count": db.query(Question).filter(Question.question_set_id == s.id, Question.subject == Subject.aptitude).count(),
        })
    return result

@router.post("/question-sets")
def create_set(data: QuestionSetCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    qs = QuestionSet(name=data.name, description=data.description)
    db.add(qs)
    db.commit()
    db.refresh(qs)
    return {"id": qs.id, "name": qs.name}

@router.post("/questions/upload/{set_id}")
async def upload_questions(
    set_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    qs = db.query(QuestionSet).filter(QuestionSet.id == set_id).first()
    if not qs:
        raise HTTPException(status_code=404, detail="Question set not found")

    content = await file.read()
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File parse error: {str(e)}")

    required = ['subject', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option']
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing columns: {missing}")

    subject_map = {
        'tamil': Subject.tamil, 'general studies': Subject.general_studies,
        'aptitude': Subject.aptitude, 'aptitude & mental ability': Subject.aptitude,
        'gs': Subject.general_studies,
    }
    diff_map = {'easy': Difficulty.easy, 'medium': Difficulty.medium, 'hard': Difficulty.hard}

    added = 0
    errors = []
    for idx, row in df.iterrows():
        try:
            subj_raw = str(row['subject']).strip().lower()
            subj = subject_map.get(subj_raw)
            if not subj:
                errors.append(f"Row {idx+2}: Unknown subject '{row['subject']}'")
                continue
            correct = str(row['correct_option']).strip().upper()
            if correct not in ['A', 'B', 'C', 'D']:
                errors.append(f"Row {idx+2}: Invalid correct_option '{correct}'")
                continue
            diff = diff_map.get(str(row.get('difficulty', 'medium')).strip().lower(), Difficulty.medium)
            q = Question(
                question_set_id=set_id,
                subject=subj,
                question_text=str(row['question_text']).strip(),
                option_a=str(row['option_a']).strip(),
                option_b=str(row['option_b']).strip(),
                option_c=str(row['option_c']).strip(),
                option_d=str(row['option_d']).strip(),
                correct_option=correct,
                explanation=str(row.get('explanation', '') or '').strip() or None,
                difficulty=diff,
            )
            db.add(q)
            added += 1
        except Exception as e:
            errors.append(f"Row {idx+2}: {str(e)}")

    db.commit()
    return {"added": added, "errors": errors[:10], "total_errors": len(errors)}

@router.delete("/questions/{q_id}")
def delete_question(q_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    q = db.query(Question).filter(Question.id == q_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(q)
    db.commit()
    return {"deleted": True}

@router.get("/questions/{set_id}")
def list_questions(set_id: int, subject: Optional[str] = None, page: int = 1, db: Session = Depends(get_db), _=Depends(require_admin)):
    q = db.query(Question).filter(Question.question_set_id == set_id)
    if subject:
        q = q.filter(Question.subject == subject)
    total = q.count()
    items = q.offset((page-1)*20).limit(20).all()
    return {
        "total": total, "page": page, "pages": (total+19)//20,
        "items": [{"id": i.id, "subject": i.subject.value, "question_text": i.question_text[:80],
                   "correct_option": i.correct_option, "difficulty": i.difficulty.value} for i in items]
    }

# Mock Tests
@router.get("/mock-tests")
def list_mock_tests(db: Session = Depends(get_db), _=Depends(require_admin)):
    tests = db.query(MockTest).all()
    return [{"id": t.id, "title": t.title, "description": t.description,
             "is_active": t.is_active, "duration_minutes": t.duration_minutes,
             "question_set_id": t.question_set_id,
             "tamil_count": t.tamil_count, "gs_count": t.gs_count, "aptitude_count": t.aptitude_count,
             "created_at": t.created_at.isoformat()} for t in tests]

@router.post("/mock-tests")
def create_mock_test(data: MockTestCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    qs = db.query(QuestionSet).filter(QuestionSet.id == data.question_set_id).first()
    if not qs:
        raise HTTPException(status_code=404, detail="Question set not found")
    mt = MockTest(**data.model_dump())
    db.add(mt)
    db.commit()
    db.refresh(mt)
    return {"id": mt.id, "title": mt.title}

@router.patch("/mock-tests/{test_id}/toggle")
def toggle_test(test_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    mt = db.query(MockTest).filter(MockTest.id == test_id).first()
    if not mt:
        raise HTTPException(status_code=404, detail="Not found")
    mt.is_active = not mt.is_active
    db.commit()
    return {"is_active": mt.is_active}

# Analytics
@router.get("/analytics/{mock_test_id}")
def analytics(mock_test_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    sessions = db.query(ExamSession).filter(
        ExamSession.mock_test_id == mock_test_id,
        ExamSession.status.in_([ExamStatus.submitted, ExamStatus.expired])
    ).all()
    if not sessions:
        return {"total_attempts": 0}
    scores = [s.score for s in sessions if s.score is not None]
    mt = db.query(MockTest).filter(MockTest.id == mock_test_id).first()
    total_marks = mt.tamil_count + mt.gs_count * 2 + mt.aptitude_count * 2 if mt else 300
    return {
        "total_attempts": len(sessions),
        "average_score": round(sum(scores)/len(scores), 2) if scores else 0,
        "highest_score": max(scores) if scores else 0,
        "lowest_score": min(scores) if scores else 0,
        "total_marks": total_marks,
        "average_percentage": round((sum(scores)/len(scores)/total_marks)*100, 2) if scores else 0,
        "pass_count": sum(1 for s in scores if (s/total_marks)*100 >= 50),
        "fail_count": sum(1 for s in scores if (s/total_marks)*100 < 50),
    }

@router.get("/candidates")
def list_candidates(db: Session = Depends(get_db), _=Depends(require_admin)):
    from models.database import User, UserRole
    users = db.query(User).filter(User.role == UserRole.candidate).all()
    result = []
    for u in users:
        attempts = db.query(ExamSession).filter(
            ExamSession.user_id == u.id,
            ExamSession.status.in_([ExamStatus.submitted, ExamStatus.expired])
        ).count()
        result.append({"id": u.id, "name": u.name, "email": u.email,
                        "attempts": attempts, "created_at": u.created_at.isoformat()})
    return result
