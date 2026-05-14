# HRIS

A lean Human Resources Information System. Employees manage their own profile, request time off, and clock attendance. Managers approve their team's leave. Admins (HR) run the directory, departments, leave policies, and announcements.

Full plan in [`mvp.md`](./mvp.md). The current build state is **step 5: attendance** — employees check in / check out daily, the monthly grid surfaces LATE / HALF_DAY auto-derivations, ON_LEAVE is computed from approved leave requests, and admins can correct any record. Step 6 (announcements + admin dashboard stats) is the last MVP step per `mvp.md` §11.

## Stack

**Backend:** Python 3.11+, FastAPI, SQLAlchemy 2 (sync), Alembic, PostgreSQL, JWT auth
**Frontend:** Vite, React 18, TypeScript, Tailwind CSS, shadcn-style UI, React Query, Axios, Zustand, React Hook Form + Zod

## Project layout

```
hris/
├── backend/
│   ├── app/
│   │   ├── api/v1/        # auth, departments, employees, leave-types, leave/*, attendance
│   │   ├── core/          # Config, DB, security
│   │   ├── models/        # User, Department, Employee, LeaveType, LeaveBalance, LeaveRequest, AttendanceRecord
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # leave_service, attendance_service (LATE / HALF_DAY / ON_LEAVE derivations)
│   │   ├── main.py
│   │   └── seed.py        # Admin + sample departments + employees + leave types
│   ├── alembic/
│   ├── alembic.ini
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/    # ui/ primitives, layouts, leave/*, attendance/CheckInCard + StatusBadge, ProtectedRoute
    │   ├── hooks/         # useEmployees, useDepartments, useLeaveTypes, useLeaveBalances, useLeaveRequests, useAttendance
    │   ├── lib/           # api client, utils
    │   ├── pages/         # Login, Dashboard, Directory, MyProfile, Leave, LeaveNew, Attendance, team/*, admin/*
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

## API surface (steps 1–5)

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
| `/employees` | POST | admin | Creates user + employee + leave balances; returns temp password |
| `/employees/{id}` | PUT | admin | Full edit |
| `/employees/{id}` | DELETE | admin | Soft-terminate: status TERMINATED, user.is_active = False |
| `/leave-types` | GET | user | List |
| `/leave-types` | POST | admin | Create |
| `/leave-types/{id}` | PUT | admin | Update |
| `/leave-types/{id}` | DELETE | admin | Blocked if balances exist — use `is_active=false` instead |
| `/leave/balances/me` | GET | user | Own balances; `?year=` defaults to current year |
| `/leave/balances` | GET | admin | Filters: `employee_id`, `year` |
| `/leave/balances/{id}` | PUT | admin | Adjust `allocated_days` and/or `used_days` |
| `/leave/requests` | GET | user | Own by default; `?team=true` (manager) or `?all_users=true` (admin); `?status=` filter |
| `/leave/requests` | POST | employee | Validates dates, business days, balance, and overlapping requests |
| `/leave/requests/{id}` | GET | requester / manager / admin | |
| `/leave/requests/{id}/decision` | PATCH | manager-of-requester / admin | Body `{status: APPROVED \| REJECTED, note?}`; debits balance on approve |
| `/leave/requests/{id}/cancel` | PATCH | requester (PENDING only) / admin (any) | Re-credits balance if was APPROVED |
| `/attendance/check-in` | POST | user (employee) | Idempotent for today; sets LATE if past the configured threshold |
| `/attendance/check-out` | POST | user (employee) | Requires existing check-in; computes hours, sets HALF_DAY if < 4 |
| `/attendance/me` | GET | user | Own; `?from=&to=` default to current month |
| `/attendance` | GET | manager (own team) / admin | Filters: `employee_id`, `department_id`, `from`, `to` |
| `/attendance` | POST | admin | Manual entry (idempotent per `(employee_id, date)`) |
| `/attendance/{id}` | PUT / DELETE | admin | Correction / removal; recomputes hours and status |
| `/health` | GET | — | Liveness probe |

Subsequent steps add `/announcements`, `/admin/stats` (see `mvp.md` §5).

## After pulling step 5

```bash
cd backend
alembic revision --autogenerate -m "attendance records"
alembic upgrade head
```

The new migration adds the `attendance_records` table (unique on `(employee_id, date)`) and the `attendance_status` enum. The `ON_LEAVE` status is **not stored** — it's overlaid on read for any date covered by an APPROVED leave request, so no backfill is needed when leave is decided. The LATE threshold is controlled by `WORKDAY_START_HOUR` and `WORKDAY_LATE_THRESHOLD_MINUTES` in `.env` (server time).
