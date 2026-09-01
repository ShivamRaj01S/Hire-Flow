# Hire Flow - Automated Resume Screening and Interview Scheduling

Full-stack project with:
- Frontend: React (Vite), Tailwind CSS, modular role-based dashboards
- Backend: Node.js + Express, JWT auth, RBAC, MySQL + MongoDB
- Deployment configs: Vercel/Netlify (frontend) and Render (backend)

---

## Requirement Coverage Status

### 1) Tech stack and deployment targets
- Frontend React/Vite + Tailwind: **Done**
- Backend Node.js + Express: **Done**
- MySQL via Sequelize + MongoDB via Mongoose: **Done**
- JWT email/password + strict RBAC: **Done**
- Frontend deploy config (Vercel/Netlify): **Done**
- Backend deploy config (Render): **Done**

### 2) Database schema
- MySQL tables/models (`Users`, `JobProfiles`, `Interviews`, `AuditLogs`): **Done**
- Mongo model (`ResumeData`): **Done**

### 3) Phase 1 UI interactions
- Login/Register + role selection: **Done**
- Candidate resume upload state flow: **Done (UI flow)**
- Candidate preferred interview slots UI: **Done**
- Recruiter weighted skills job form: **Done**
- Candidate ranking table with matched/missing skills: **Done**
- Admin audit log grid: **Done**
- Recruiter scheduling UI with preferences: **Done**
- Toast notifications: **Done**

### 4) Phase 2 backend + NLP placeholder
- `server.js`: **Done**
- Secure DB connection files: **Done**
- Rule-based NLP placeholder functions: **Done**
  - Text extraction stub
  - Preprocessing (tokenize + stop-word removal)
  - Bias minimization scrubbing
  - Weighted scoring

### 5) Extra items you asked now
- Nodemailer email notifications: **Done**
- Google OAuth login: **Done**

---

## Project Structure

```text
Hire_Flow/
  frontend/
    src/
      routes/
      views/
        auth/
        candidate/
        recruiter/
        admin/
      shared/
        ui/
        security/
      main.tsx
    vercel.json
    netlify.toml
    package.json

  backend/
    src/
      constants/
      controllers/
      db/
      errors/
      middleware/
      models/
        sql/
        mongo/
      nlp/
      routes/
      services/
      utils/
    server.js
    .env.example
    package.json
    README_PHASE2.md

  render.yaml
  README.md
```

---

## Backend Functional Flow

1. Client sends request to `/api/*`
2. Security middleware applies (`helmet`, `cors`, rate-limit, payload limits)
3. Protected routes validate JWT (`Authorization: Bearer <token>`)
4. RBAC middleware checks role (Candidate/Recruiter/Administrator)
5. Controller executes business logic
6. Data is stored/read from:
   - MySQL (users/jobs/interviews/audit logs)
   - MongoDB (`ResumeData`)
7. Audit log entry is recorded for important actions
8. Standard JSON response/error returned

---

## Local Setup

### Prerequisites
- Node.js 18+
- MySQL server
- MongoDB server

### 1) Backend

```bash
cd backend
npm install
```

Create `.env` from example:

```bash
cp .env.example .env
```

Then run:

```bash
npm run dev
```

Health check:
- `http://localhost:3001/health`

### 2) Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend default:
- `http://localhost:5173`

---

## Backend API Map

Base URL: `http://localhost:3001/api`

- Auth
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/google`
  - `GET /auth/me`

- Candidate
  - `POST /candidate/resume/analyze`
  - `POST /candidate/preferences`
  - `GET /candidate/interviews`

- Recruiter
  - `POST /recruiter/job-profiles`
  - `GET /recruiter/candidates/ranking`
  - `GET /recruiter/candidate-preferences`
  - `POST /recruiter/interviews/finalize`

- Admin
  - `GET /admin/audit-logs`

- Interviews
  - `GET /interviews/calendar`

---

## Environment Variables (Backend)

See `backend/.env.example`.

Minimum required:
- `PORT`
- `CORS_ORIGIN`
- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`
- `MONGODB_URI`
- `JWT_SECRET` (long random string, at least 32 chars)
- `JWT_EXPIRES_IN`
- `GOOGLE_CLIENT_ID`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

---

## Deployment

### Frontend
- Vercel: `frontend/vercel.json`
- Netlify: `frontend/netlify.toml`

### Backend (Render)
- Blueprint: `render.yaml`
- Service root: `backend/`
- Start command: `npm start`

---

## Security and Quality Notes

- Password hashes stored using bcrypt
- No secrets hardcoded in source
- JWT validation + role checks on protected routes
- Request rate limiting and input payload limits
- Centralized error handling
- Modular code organization for maintainability

---

## Pending Enhancements (Optional Next Phase)

- API request validation layer (Zod/Joi/express-validator)
- Swagger/OpenAPI docs
- Reminder scheduler (cron/queue) for interview reminder emails

