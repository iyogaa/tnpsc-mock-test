from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.units import inch
from io import BytesIO
from datetime import datetime

def generate_result_pdf(candidate_name: str, email: str, result_data: dict) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch,
                            leftMargin=0.6*inch, rightMargin=0.6*inch)
    styles = getSampleStyleSheet()
    story = []

    title_style = ParagraphStyle('title', parent=styles['Title'], fontSize=18, textColor=colors.HexColor('#1e3a8a'), spaceAfter=4)
    sub_style = ParagraphStyle('sub', parent=styles['Normal'], fontSize=11, textColor=colors.HexColor('#64748b'), spaceAfter=12)
    section_style = ParagraphStyle('section', parent=styles['Normal'], fontSize=13, fontName='Helvetica-Bold', textColor=colors.HexColor('#1e3a8a'), spaceAfter=6, spaceBefore=10)
    body_style = ParagraphStyle('body', parent=styles['Normal'], fontSize=10, spaceAfter=4)
    correct_style = ParagraphStyle('correct', parent=body_style, textColor=colors.HexColor('#10b981'))
    wrong_style = ParagraphStyle('wrong', parent=body_style, textColor=colors.HexColor('#ef4444'))

    score = result_data.get("score", 0)
    total = result_data.get("total_marks", 300)
    pct = result_data.get("percentage", 0)
    correct = result_data.get("total_correct", 0)
    wrong = result_data.get("total_wrong", 0)
    unanswered = result_data.get("total_unanswered", 0)
    section_scores = result_data.get("section_scores", {})
    detailed = result_data.get("detailed_results", [])

    # Header
    story.append(Paragraph("TNPSC Group 4 Mock Test", title_style))
    story.append(Paragraph(f"Result Report — {datetime.now().strftime('%d %B %Y, %I:%M %p')}", sub_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#3b82f6')))
    story.append(Spacer(1, 10))

    # Candidate + Score summary table
    pct_color = '#10b981' if pct >= 70 else '#f59e0b' if pct >= 50 else '#ef4444'
    summary_data = [
        ["Candidate", candidate_name, "Score", f"{score} / {total}"],
        ["Email", email, "Percentage", f"{pct}%"],
        ["Correct", str(correct), "Wrong", str(wrong)],
        ["Unanswered", str(unanswered), "Status", "PASS" if pct >= 50 else "FAIL"],
    ]
    t = Table(summary_data, colWidths=[1.2*inch, 2.3*inch, 1.2*inch, 2.3*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#eff6ff')),
        ('BACKGROUND', (0,2), (-1,2), colors.HexColor('#f8fafc')),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTNAME', (2,0), (2,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

    # Section scores
    story.append(Paragraph("Section-wise Performance", section_style))
    sec_data = [["Subject", "Questions", "Correct", "Wrong", "Skipped", "Score"]]
    for subj, data in section_scores.items():
        sec_data.append([subj, str(data['correct']+data['wrong']+data['unanswered']),
                         str(data['correct']), str(data['wrong']), str(data['unanswered']), str(data['score'])])
    st = Table(sec_data, colWidths=[2.3*inch, 1*inch, 0.9*inch, 0.9*inch, 0.9*inch, 0.8*inch])
    st.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e3a8a')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('ALIGN', (1,0), (-1,-1), 'CENTER'),
    ]))
    story.append(st)
    story.append(Spacer(1, 12))

    # Detailed review
    story.append(Paragraph("Detailed Answer Review", section_style))
    for i, item in enumerate(detailed[:50], 1):  # First 50 in PDF
        status_color = '#10b981' if item['is_correct'] else '#ef4444' if item['your_answer'] else '#94a3b8'
        status_label = '✓ Correct' if item['is_correct'] else '✗ Wrong' if item['your_answer'] else '— Skipped'
        q_style = ParagraphStyle(f'q{i}', parent=body_style, leftIndent=0)
        story.append(Paragraph(f"<b>Q{i}.</b> {item['question_text'][:200]}", q_style))
        story.append(Paragraph(f"Your Answer: <b>{item.get('your_answer','—')}</b>  |  Correct: <b>{item['correct_answer']}</b>  |  <font color='{status_color}'>{status_label}</font>", body_style))
        if item.get('explanation'):
            story.append(Paragraph(f"<i>Explanation: {item['explanation'][:150]}</i>", ParagraphStyle('exp', parent=body_style, textColor=colors.HexColor('#64748b'), leftIndent=12)))
        story.append(Spacer(1, 4))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()
