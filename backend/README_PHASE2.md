# Hire Flow Backend (Phase 2)

This backend provides:
- Express server with secure defaults (`helmet`, `cors`, rate limit, payload limits)
- MySQL (Sequelize) for relational entities
- MongoDB (Mongoose) for resume analysis payload
- JWT auth with RBAC (`Candidate`, `Recruiter`, `Administrator`)
- Audit logging for key actions
- Rule-based NLP placeholder utilities

## Run

1. Copy `.env.example` to `.env`
2. Install deps:
   - `npm install`
3. Start:
   - Dev: `npm run dev`
   - Prod: `npm start`

## API Base

- `http://localhost:3001/api`

## Main Endpoints

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me` (Bearer token)

### Candidate
- `POST /candidate/resume/analyze`
- `POST /candidate/preferences`
- `GET /candidate/interviews`

### Recruiter
- `POST /recruiter/job-profiles`
- `GET /recruiter/candidates/ranking`
- `GET /recruiter/candidate-preferences`
- `POST /recruiter/interviews/finalize`

### Admin
- `GET /admin/audit-logs`

### Interview Calendar
- `GET /interviews/calendar`

## Notes

- JWT secret must be at least 32 chars.
- In production, set strict `CORS_ORIGIN` to your frontend URL.
- Avoid storing secrets in source control.
