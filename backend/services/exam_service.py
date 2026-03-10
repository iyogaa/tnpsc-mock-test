import random
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from models.database import (
    ExamSession, MockTest, Question, User, ExamStatus, Subject
)

SUBJECT_MARKS = {
    "Tamil": 1,
    "General Studies": 1,
    "Aptitude & Mental Ability": 1,
}

def _shuffle_options(question: Question) -> Dict[str, Any]:
    """Shuffle options and return mapping from display position to real option."""
    options = [
        ("A", question.option_a),
        ("B", question.option_b),
        ("C", question.option_c),
        ("D", question.option_d),
    ]
    random.shuffle(options)
    labels = ["A", "B", "C", "D"]
    option_map = {}
    shuffled = {}
    for i, (orig_label, text) in enumerate(options):
        new_label = labels[i]
        shuffled[new_label] = text
        option_map[new_label] = orig_label  # new_label -> original label
    return shuffled, option_map, option_map

def build_exam_questions(db: Session, mock_test: MockTest, session: ExamSession) -> List[Dict[str, Any]]:
    """Build question list for display given session's order + option map."""
    q_ids = session.questions_order
    option_maps = session.option_map or {}
    questions = {q.id: q for q in db.query(Question).filter(Question.id.in_(q_ids)).all()}
    result = []
    for qid in q_ids:
        q = questions.get(qid)
        if not q:
            continue
        qmap = option_maps.get(str(qid), {"A": "A", "B": "B", "C": "C", "D": "D"})
        # Build display options using map
        display_opts = {}
        for new_lbl, orig_lbl in qmap.items():
            orig_text = getattr(q, f"option_{orig_lbl.lower()}")
            display_opts[new_lbl] = orig_text
        result.append({
            "id": q.id,
            "subject": q.subject.value,
            "question_text": q.question_text,
            "options": display_opts,
            "difficulty": q.difficulty.value,
        })
    return result

def create_exam_session(db: Session, user_id: int, mock_test_id: int) -> ExamSession:
    mock_test = db.query(MockTest).filter(MockTest.id == mock_test_id, MockTest.is_active == True).first()
    if not mock_test:
        raise ValueError("Mock test not found or inactive")

    # Check no active session
    existing = db.query(ExamSession).filter(
        ExamSession.user_id == user_id,
        ExamSession.mock_test_id == mock_test_id,
        ExamSession.status == ExamStatus.in_progress
    ).first()
    if existing:
        return existing  # Resume

    # Get questions per subject
    from models.database import QuestionSet
    qs_id = mock_test.question_set_id
    subjects_needed = [
        (Subject.tamil, mock_test.tamil_count),
        (Subject.general_studies, mock_test.gs_count),
        (Subject.aptitude, mock_test.aptitude_count),
    ]
    selected_ids = []
    option_map = {}

    for subject, count in subjects_needed:
        pool = db.query(Question).filter(
            Question.question_set_id == qs_id,
            Question.subject == subject
        ).all()
        chosen = random.sample(pool, min(count, len(pool)))
        for q in chosen:
            selected_ids.append(q.id)
            if mock_test.randomize_options:
                _, qmap, _ = _shuffle_options(q)
                option_map[str(q.id)] = qmap
            else:
                option_map[str(q.id)] = {"A": "A", "B": "B", "C": "C", "D": "D"}

    if mock_test.randomize_questions:
        random.shuffle(selected_ids)

    session = ExamSession(
        user_id=user_id,
        mock_test_id=mock_test_id,
        status=ExamStatus.in_progress,
        questions_order=selected_ids,
        option_map=option_map,
        answers={},
        marked_for_review=[],
        started_at=datetime.now(timezone.utc),
        time_remaining_seconds=mock_test.duration_minutes * 60,
        tab_switch_count=0,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def save_answer(db: Session, session_id: int, user_id: int, question_id: int, selected_option: Optional[str]) -> bool:
    session = db.query(ExamSession).filter(
        ExamSession.id == session_id,
        ExamSession.user_id == user_id,
        ExamSession.status == ExamStatus.in_progress
    ).first()
    if not session:
        return False
    answers = dict(session.answers or {})
    if selected_option is None:
        answers.pop(str(question_id), None)
    else:
        answers[str(question_id)] = selected_option
    session.answers = answers
    db.commit()
    return True

def mark_review(db: Session, session_id: int, user_id: int, question_id: int, marked: bool) -> bool:
    session = db.query(ExamSession).filter(
        ExamSession.id == session_id,
        ExamSession.user_id == user_id,
        ExamSession.status == ExamStatus.in_progress
    ).first()
    if not session:
        return False
    reviewed = list(session.marked_for_review or [])
    if marked and question_id not in reviewed:
        reviewed.append(question_id)
    elif not marked and question_id in reviewed:
        reviewed.remove(question_id)
    session.marked_for_review = reviewed
    db.commit()
    return True

def update_time(db: Session, session_id: int, user_id: int, time_remaining: int):
    session = db.query(ExamSession).filter(
        ExamSession.id == session_id,
        ExamSession.user_id == user_id,
    ).first()
    if session and session.status == ExamStatus.in_progress:
        session.time_remaining_seconds = max(0, time_remaining)
        db.commit()

def record_tab_switch(db: Session, session_id: int, user_id: int) -> int:
    session = db.query(ExamSession).filter(
        ExamSession.id == session_id,
        ExamSession.user_id == user_id,
        ExamSession.status == ExamStatus.in_progress
    ).first()
    if not session:
        return 0
    session.tab_switch_count = (session.tab_switch_count or 0) + 1
    db.commit()
    return session.tab_switch_count

def calculate_and_submit(db: Session, session_id: int, user_id: int, auto: bool = False) -> Optional[Dict]:
    session = db.query(ExamSession).filter(
        ExamSession.id == session_id,
        ExamSession.user_id == user_id,
        ExamSession.status == ExamStatus.in_progress
    ).first()
    if not session:
        return None

    mock_test = session.mock_test
    answers = dict(session.answers or {})
    option_maps = session.option_map or {}
    q_ids = session.questions_order
    questions = {q.id: q for q in db.query(Question).filter(Question.id.in_(q_ids)).all()}

    correct = 0
    wrong = 0
    unanswered = 0
    section_scores = {"Tamil": {"correct": 0, "wrong": 0, "unanswered": 0, "score": 0},
                      "General Studies": {"correct": 0, "wrong": 0, "unanswered": 0, "score": 0},
                      "Aptitude & Mental Ability": {"correct": 0, "wrong": 0, "unanswered": 0, "score": 0}}
    detailed = []

    for qid in q_ids:
        q = questions.get(qid)
        if not q:
            continue
        subj = q.subject.value
        qmap = option_maps.get(str(qid), {"A": "A", "B": "B", "C": "C", "D": "D"})
        # reverse map: new_label -> orig_label
        user_new_label = answers.get(str(qid))
        if user_new_label is None:
            unanswered += 1
            section_scores[subj]["unanswered"] += 1
            status = "unanswered"
        else:
            orig_label = qmap.get(user_new_label, user_new_label)
            if orig_label == q.correct_option:
                correct += 1
                section_scores[subj]["correct"] += 1
                section_scores[subj]["score"] += 1
                status = "correct"
            else:
                wrong += 1
                section_scores[subj]["wrong"] += 1
                status = "wrong"

        # Find correct display option
        rev_map = {v: k for k, v in qmap.items()}
        correct_display = rev_map.get(q.correct_option, q.correct_option)

        display_opts = {}
        for new_lbl, orig_lbl in qmap.items():
            display_opts[new_lbl] = getattr(q, f"option_{orig_lbl.lower()}")

        detailed.append({
            "question_id": qid,
            "subject": subj,
            "question_text": q.question_text,
            "options": display_opts,
            "your_answer": user_new_label,
            "correct_answer": correct_display,
            "is_correct": status == "correct",
            "status": status,
            "explanation": q.explanation,
            "difficulty": q.difficulty.value,
        })

    # TNPSC scoring: Tamil=100q*1=100, GS=75q*1=75 + bonus... actually 300 total marks
    # Official: Tamil 100q=100m, GS 75q=150m (2 per q), Aptitude 25q=50m (2 per q) = 300
    total_marks = mock_test.tamil_count * 1 + mock_test.gs_count * 2 + mock_test.aptitude_count * 2
    score_value = (
        section_scores["Tamil"]["score"] * 1 +
        section_scores["General Studies"]["score"] * 2 +
        section_scores["Aptitude & Mental Ability"]["score"] * 2
    )
    percentage = round((score_value / total_marks) * 100, 2) if total_marks else 0

    session.status = ExamStatus.expired if auto else ExamStatus.submitted
    session.submitted_at = datetime.now(timezone.utc)
    session.score = score_value
    session.total_correct = correct
    session.total_wrong = wrong
    session.total_unanswered = unanswered
    session.section_scores = section_scores
    db.commit()

    return {
        "session_id": session_id,
        "score": score_value,
        "total_marks": total_marks,
        "percentage": percentage,
        "total_correct": correct,
        "total_wrong": wrong,
        "total_unanswered": unanswered,
        "section_scores": section_scores,
        "detailed_results": detailed,
    }
