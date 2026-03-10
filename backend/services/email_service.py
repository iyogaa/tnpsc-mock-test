import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import Optional

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER)
FROM_NAME = os.getenv("FROM_NAME", "TNPSC Mock Test")

def send_result_email(
    to_email: str,
    candidate_name: str,
    result_data: dict,
    pdf_bytes: Optional[bytes] = None
) -> bool:
    if not SMTP_USER or not SMTP_PASS:
        print(f"[EMAIL SKIP] No SMTP configured. Would send to {to_email}")
        return True

    score = result_data.get("score", 0)
    total = result_data.get("total_marks", 300)
    pct = result_data.get("percentage", 0)
    correct = result_data.get("total_correct", 0)
    wrong = result_data.get("total_wrong", 0)
    unanswered = result_data.get("total_unanswered", 0)
    section = result_data.get("section_scores", {})

    def grade_color(p):
        if p >= 70: return "#10b981"
        if p >= 50: return "#f59e0b"
        return "#ef4444"

    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body {{ font-family: 'Segoe UI', sans-serif; background: #f0f4f8; margin: 0; padding: 20px; }}
  .card {{ max-width: 600px; margin: auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }}
  .header {{ background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: white; padding: 32px 24px; text-align: center; }}
  .header h1 {{ margin: 0; font-size: 24px; }}
  .header p {{ margin: 6px 0 0; opacity: 0.8; }}
  .score-circle {{ width: 100px; height: 100px; border-radius: 50%; border: 6px solid {grade_color(pct)}; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 24px auto; }}
  .score-num {{ font-size: 28px; font-weight: bold; color: {grade_color(pct)}; line-height: 1; }}
  .score-total {{ font-size: 12px; color: #64748b; }}
  .stats {{ display: flex; gap: 12px; padding: 0 24px 16px; }}
  .stat {{ flex: 1; background: #f8fafc; border-radius: 10px; padding: 12px; text-align: center; }}
  .stat-val {{ font-size: 22px; font-weight: bold; }}
  .stat-lbl {{ font-size: 11px; color: #64748b; margin-top: 2px; }}
  .section {{ margin: 0 24px 12px; background: #f8fafc; border-radius: 10px; padding: 14px 16px; }}
  .section-title {{ font-weight: 600; color: #1e3a8a; margin-bottom: 8px; }}
  .bar-bg {{ background: #e2e8f0; border-radius: 4px; height: 8px; }}
  .bar-fill {{ height: 8px; border-radius: 4px; background: {grade_color(pct)}; }}
  .footer {{ text-align: center; padding: 20px 24px; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }}
</style></head>
<body>
<div class="card">
  <div class="header">
    <h1>🏆 TNPSC Group 4 Mock Test Result</h1>
    <p>Hello {candidate_name}! Here are your results.</p>
  </div>
  <div style="padding: 24px 24px 0; text-align: center;">
    <div class="score-circle" style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center;">
      <span class="score-num">{score}</span>
      <span class="score-total">/ {total}</span>
    </div>
    <p style="font-size: 28px; font-weight: 800; color: {grade_color(pct)}; margin: 0;">{pct}%</p>
    <p style="color: #64748b; margin: 4px 0 16px;">{'Excellent!' if pct>=70 else 'Keep Practicing!' if pct>=50 else 'Needs More Effort'}</p>
  </div>
  <div class="stats">
    <div class="stat"><div class="stat-val" style="color:#10b981">{correct}</div><div class="stat-lbl">Correct</div></div>
    <div class="stat"><div class="stat-val" style="color:#ef4444">{wrong}</div><div class="stat-lbl">Wrong</div></div>
    <div class="stat"><div class="stat-val" style="color:#94a3b8">{unanswered}</div><div class="stat-lbl">Skipped</div></div>
  </div>
  {''.join(f'''
  <div class="section">
    <div class="section-title">{subj}</div>
    <div style="display:flex;justify-content:space-between;font-size:13px;color:#64748b;margin-bottom:6px;">
      <span>Score: {data['score']}</span>
      <span>Correct: {data['correct']} | Wrong: {data['wrong']}</span>
    </div>
  </div>
  ''' for subj, data in section.items())}
  <div class="footer">
    <p>Best of luck for your TNPSC Group 4 preparation! 🌟</p>
    <p style="color:#94a3b8;">TNPSC Mock Test Platform</p>
  </div>
</div>
</body></html>"""

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"TNPSC Group 4 Mock Test Result – {candidate_name} | Score: {score}/{total} ({pct}%)"
        msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html, "html"))

        if pdf_bytes:
            pdf_part = MIMEApplication(pdf_bytes, _subtype="pdf")
            pdf_part.add_header("Content-Disposition", "attachment", filename="TNPSC_Result.pdf")
            msg.attach(pdf_part)

        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False
