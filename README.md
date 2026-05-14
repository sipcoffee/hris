# HRIS

A lean Human Resources Information System. Employees manage their own profile, request time off, and clock attendance. Managers approve their team's leave. Admins (HR) run the directory, departments, leave policies, and announcements.

Full plan in [`mvp.md`](./mvp.md). The current build state is **step 2: departments + employees** — full directory, employee provisioning, admin CRUD, org structure (manager + department head). Steps 3–6 (leave types/balances, leave requests, attendance, announcements) are next per `mvp.md` §11.

## Stack

**Backend:** Python 3.11+, FastAPI, SQLAlchemy 2 (sync), Alembic, PostgreSQL, JWT auth
**Frontend:** Vite, React 18, TypeScript, Tailwind CSS, shadcn-style UI, React Query, Axios, Zustand, React Hook Form + Zod

## Project layout

```
hris/
├── backend/
│   ├── app/
│   │   ├── api/v1/        # auth, departments, employees
│   │   ├── core/          # Config, DB, security
│   │   ├── models/        # User, Department, Employee
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── main.py
│   │   └── seed.py        # Admin + sample departments + employees
│   ├── alembic/
│   ├── alembic.ini
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/    # ui/ primitives, layouts (AppShell, AdminLayout), ProtectedRoute
    │   ├── hooks/         # useEmployees, useDepartments
    │   ├── lib/           # api client, utils
    │   ├── pages/         # Login, Dashboard, Directory, MyProfile, admin/*
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

There is no public sign-up. Admins provision employees through the admin UI (`/admin/employees/new`) or the `POST /employees` API. The seed script also creates three sample departments, three managers, and six employees — all using password `ChangeMe123!` and forced to change on first login.

## API surface (steps 1–2)

| Route | Method | Auth | Notes |
|-------|--------|------|-------|
| `/auth/login` | POST | — | Email + password → JWT |
| `/auth/me` | GET | user | Current user + linked employee summary |
| `/auth/change-password` | POST | user | Current + new password |
| `/departments` | GET | user | List (with head + employee count) |
| `/departments` | POST | admin | Create |
| `/departments/{id}` | PUT / DELETE | admin | Update / delete (blocked if non-empty) |
| `/employees` | GET | user | Paginated; filters `q`, `department_id`, `employment_status` |
| `/employees/me` | GET / PUT | user | Own profile; PUT limited to phone/address/DOB |
| `/employees/{id}` | GET | user | PII masked unless self or admin |
| `/employees/{id}/reports` | GET | self-or-admin | Direct reports |
| `/employees` | POST | admin | Creates user + employee atomically; returns temp password |
| `/employees/{id}` | PUT | admin | Full edit |
| `/employees/{id}` | DELETE | admin | Soft-terminate: status TERMINATED, user.is_active = False |
| `/health` | GET | — | Liveness probe |

Subsequent steps add `/leave/*`, `/attendance/*`, `/announcements`, `/admin/stats` (see `mvp.md` §5).

## After pulling step 2

```bash
cd backend
alembic revision --autogenerate -m "departments and employees"
alembic upgrade head
python -m app.seed
```

The new migration adds the `departments` and `employees` tables plus the circular FK between `departments.head_employee_id` and `employees.id` (handled with `use_alter`). Re-running the seed is safe; it only inserts missing rows.
