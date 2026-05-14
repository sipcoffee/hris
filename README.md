# HRIS

A lean Human Resources Information System. Employees manage their own profile, request time off, and clock attendance. Managers approve their team's leave. Admins (HR) run the directory, departments, leave policies, and announcements.

Full plan in [`mvp.md`](./mvp.md). The current build state is **step 1: skeleton + auth** — login, JWT, role-aware routing, and a dashboard placeholder. Subsequent steps (departments, employees, leave, attendance) are tracked in `mvp.md` §11.

## Stack

**Backend:** Python 3.11+, FastAPI, SQLAlchemy 2 (sync), Alembic, PostgreSQL, JWT auth
**Frontend:** Vite, React 18, TypeScript, Tailwind CSS, shadcn-style UI, React Query, Axios, Zustand, React Hook Form + Zod

## Project layout

```
hris/
├── backend/
│   ├── app/
│   │   ├── api/v1/        # Routers: auth (more added per step)
│   │   ├── core/          # Config, DB, security
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── main.py
│   │   └── seed.py        # Admin user
│   ├── alembic/
│   ├── alembic.ini
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/    # ui/ primitives + layout + ProtectedRoute
    │   ├── lib/           # api client, utils
    │   ├── pages/         # Login, ChangePassword, Dashboard
    │   ├── stores/        # Zustand auth store
    │   └── types/
    ├── package.json
    └── tailwind.config.js
```

## Prerequisites

- Python 3.11+
- Node 18+ and npm
- A running PostgreSQL instance (local or Docker)

```bash
# Optional: spin up Postgres in Docker
docker run --name hris-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=hris -p 5432:5432 -d postgres:16
```

## Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env — set DATABASE_URL, SECRET_KEY, ADMIN_PASSWORD

# Generate the initial migration from the models, then apply it
alembic revision --autogenerate -m "initial schema"
alembic upgrade head

# Seed the admin user
python -m app.seed

# Start the API
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env       # VITE_API_URL=http://localhost:8000/api/v1
npm run dev
```

App: http://localhost:5173

## Default credentials

The seed script creates an admin from `.env`:

- Email: `admin@hris.local` (default)
- Password: `ChangeMe123!` (default — change this in `.env` before seeding for any non-toy use)

There is no public sign-up. In later steps, admins provision employees through `/admin/employees`.

## Step 1 API surface

| Route | Method | Auth | Notes |
|-------|--------|------|-------|
| `/auth/login` | POST | — | Email + password → JWT |
| `/auth/me` | GET | user | Current user |
| `/auth/change-password` | POST | user | Current + new password |
| `/health` | GET | — | Liveness probe |

Subsequent steps add `/departments`, `/employees`, `/leave/*`, `/attendance/*`, `/announcements`, `/admin/stats` (see `mvp.md` §5).
