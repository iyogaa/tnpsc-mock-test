# TNPSC Group 4 Mock Test Platform v2.0
### தேர்வு பயிற்சி தளம் — Production Grade

> **200 Questions | 300 Marks | 3 Hours | Real Exam Pattern**

---

## 🚀 Quick Deploy (Free — Zero Cost)

### Prerequisites
- GitHub account
- Render.com account (free backend)
- Vercel account (free frontend)
- Supabase or Neon (free PostgreSQL) — OR use SQLite (simpler)

---

## ⚡ 5-Step Deploy

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "TNPSC Mock Test Platform v2.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tnpsc-mock-test.git
git push -u origin main
```

### Step 2 — Deploy Backend on Render (Free)
1. Go to https://render.com → New → Web Service
2. Connect your GitHub repo
3. **Settings:**
   - Root Directory: `backend`
   - Runtime: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. **Environment Variables:**
   ```
   DATABASE_URL   = sqlite:///./tnpsc.db       ← Simple (or use Supabase PostgreSQL)
   SECRET_KEY     = your-random-32-char-secret
   ADMIN_EMAIL    = admin@yourdomain.com
   ADMIN_PASS     = YourStrongPassword@123
   SMTP_USER      = your@gmail.com             ← For email results
   SMTP_PASS      = your-gmail-app-password
   ```
5. Deploy → Copy the URL: `https://your-app.onrender.com`

### Step 3 — Deploy Frontend on Vercel (Free)
1. Go to https://vercel.com → New Project → Import GitHub repo
2. **Settings:**
   - Root Directory: `frontend`
   - Framework Preset: Vite
3. **Environment Variables:**
   ```
   VITE_API_URL = https://your-app.onrender.com
   ```
4. Deploy → Your app is live!

### Step 4 — Add GitHub Secrets (for CI/CD)
Go to GitHub → Settings → Secrets → Actions:
```
RENDER_DEPLOY_HOOK  → From Render dashboard → Settings → Deploy Hook
VERCEL_TOKEN        → From Vercel → Account Settings → Tokens
VITE_API_URL        → https://your-backend.onrender.com
```

### Step 5 — Admin Setup
1. Visit your Vercel URL
2. Login with: `admin@yourdomain.com` / `YourStrongPassword@123`
3. Admin Panel → Question Sets → Create Set → Upload CSV
4. Admin Panel → Mock Tests → Create Test → Link question set
5. Share URL with candidates!

---

## 📊 Exam Pattern (Exactly TNPSC Group 4)

| Section | Questions | Marks/Q | Total |
|---------|-----------|---------|-------|
| Tamil / தமிழ் | 100 | 1 | 100 |
| General Studies | 75 | 2 | 150 |
| Aptitude & Mental Ability | 25 | 2 | 50 |
| **Total** | **200** | — | **300** |

**Duration:** 3 hours (180 minutes) | **No Negative Marking**

---

## 📥 Adding Questions

### Method 1: Upload CSV/Excel via Admin Panel
Go to Admin → Question Sets → Upload CSV

**Required columns:**
```
subject | question_text | option_a | option_b | option_c | option_d | correct_option | explanation | difficulty
```

**subject values:** `Tamil` | `General Studies` | `Aptitude & Mental Ability`
**correct_option:** `A` | `B` | `C` | `D`
**difficulty:** `easy` | `medium` | `hard`

A sample file is at `scripts/sample_questions.csv`

### Method 2: Add via Admin Panel UI
Admin → Question Sets → (select set) → individual question forms

### 🎲 Multiple Question Sets (Randomized)
Create 4-5 different question sets (e.g. Set 1, Set 2, Set 3...).
Create a separate Mock Test for each set.
The platform will **randomly pick** questions from the set for each session.
Candidates never get the same question order twice!

---

## 🏗️ Architecture

```
Frontend (Vercel)          Backend (Render)          Database
React + Vite           →   FastAPI (Python)      →   SQLite / PostgreSQL
  - Auth pages              - JWT Auth                 - Users
  - Exam interface          - Exam sessions            - Questions
  - Admin panel             - Auto-grading             - Exam sessions
  - Results view            - Email sending            - Results
```

---

## 🔒 Security Features

- JWT authentication with 24h expiry
- Tab switch detection (auto-submit at 5 violations)
- Single active session per user per test
- Answers saved to DB on every selection (no data loss)
- Timer synced to server every 30 seconds
- Browser crash recovery — resume from where you left off

---

## 💻 Local Development

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Edit with your values
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
cp .env.example .env.local
# Set VITE_API_URL=http://localhost:8000
npm run dev
```

Open: http://localhost:5173

**API Docs:** http://localhost:8000/docs

---

## 🧪 Running Tests

```bash
cd backend
pytest tests/ -v
```

Tests cover:
- User registration & login
- Exam start & session creation  
- Answer saving & persistence
- Mark for review toggle
- Submit & score calculation
- Tab switch detection
- Leaderboard & analytics

---

## 🆓 Free Tier Limits

| Service | Free Limit |
|---------|-----------|
| Render | 750 hrs/month, spins down after 15min inactivity |
| Vercel | 100GB bandwidth/month |
| SQLite on Render | Persists to disk (reset on deploy) — use Supabase for permanent data |
| Supabase | 500MB storage, 2 projects |
| Gmail SMTP | 500 emails/day |

**Recommendation:** For real-world use with many students, use Supabase PostgreSQL (free 500MB) instead of SQLite.

---

## 📧 Email Setup (Gmail)

1. Enable 2FA on your Gmail
2. Go to Google Account → Security → App Passwords
3. Generate password for "Mail"
4. Use that 16-char password as `SMTP_PASS`

---

## 📁 Project Structure

```
tnpsc-mock-test/
├── frontend/              # React + Vite
│   ├── src/
│   │   ├── pages/         # Auth, Dashboard, Exam, Results, Admin
│   │   ├── hooks/         # useExamTimer, useTabSwitch
│   │   ├── context/       # AuthContext
│   │   └── utils/         # API client
│   └── package.json
├── backend/               # FastAPI + SQLAlchemy
│   ├── routers/           # auth, exam, admin
│   ├── models/            # DB models + Pydantic schemas
│   ├── services/          # exam_service, email_service, pdf_service
│   ├── tests/             # pytest test suite
│   └── requirements.txt
├── scripts/
│   └── sample_questions.csv
├── .github/workflows/     # CI/CD pipeline
└── README.md
```

---

Built with ❤️ for Reshu's TNPSC Group 4 success! 🌟
