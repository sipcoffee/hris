# HRIS MVP

A lean Human Resources Information System. Employees manage their own profile, request time off, and clock attendance. Managers approve their team's leave and review attendance. Admins (HR) run the directory, departments, leave policies, and the whole show.

The architecture, folder layout, and patterns are deliberately copied from `D:\Projects\BoltWear` so the two projects feel like siblings.

---

## 1. Why this scope

A real HRIS spans payroll, recruiting, benefits, performance, learning, compliance, expenses, shift planning, and more. None of that fits an MVP. The scope below covers the four things every HRIS *must* do before any of the rest matters:

1. **Know who works here** — employee directory with org structure.
2. **Know who reports to whom** — manager hierarchy + department heads.
3. **Handle time off** — request, approve, balance tracking. This is the single feature most small companies adopt an HRIS for.
4. **Track attendance** — daily check-in / check-out, baseline data for everything else later (payroll, productivity, compliance).

Everything else (payroll, performance reviews, recruiting, benefits, docs, training) is deferred. See §10.

---

## 2. Stack

Identical to BoltWear so the team can move between repos with zero context switch:

**Backend:** Python 3.11+, FastAPI, SQLAlchemy 2 (sync), Alembic, PostgreSQL, JWT auth, Pydantic v2, passlib/bcrypt.

**Frontend:** Vite, React 18, TypeScript, Tailwind CSS, shadcn-style UI primitives (Radix + CVA), React Query, Axios, Zustand, React Hook Form + Zod, React Router 6, lucide-react, sonner for toasts.

Pinning matches BoltWear's `requirements.txt` / `package.json` so dependency drift between projects stays small.

---

## 3. Roles and permissions

BoltWear has two roles (CLIENT / OWNER). HRIS needs three because the middle tier — managers approving their direct reports' leave — is the whole point.

| Role | Can do |
|------|--------|
| `EMPLOYEE` | View directory, edit own profile (limited fields), request leave, view own balances, check in / check out, view own attendance |
| `MANAGER` | Everything an employee can, **plus** view their direct reports' profiles, approve / reject their reports' leave requests, view team attendance |
| `ADMIN` | Full access: create / edit / terminate employees, manage departments, manage leave types and balances, override any record, view all data, post announcements |

Enforcement lives in FastAPI dependencies (`require_employee`, `require_manager`, `require_admin`), mirroring BoltWear's `require_owner` pattern. Row-level checks (e.g. "is this leave request from one of my reports?") happen inside the route handler.

**No self-registration.** Unlike BoltWear, employees don't sign themselves up. Admins create employees, the system provisions the user account, and credentials are surfaced to the admin (printed once at creation — production would email them).

---

## 4. Data model

```
users ──1:1── employees ──N:1── departments
                  │
                  ├── manager_id ─→ employees (self FK)
                  ├──< leave_requests >── leave_types
                  ├──< leave_balances >── leave_types
                  └──< attendance_records
announcements (standalone)
```

### `users` (auth identity only)
- `id`, `email` (unique), `hashed_password`, `role` (`ADMIN` | `MANAGER` | `EMPLOYEE`), `is_active`, `created_at`

Kept thin on purpose — like BoltWear's `User`. All HR data lives on `employees`.

### `employees` (HR profile, 1:1 with `users`)
- `id`, `user_id` (FK, unique)
- `first_name`, `last_name`, `date_of_birth`, `phone`, `address`
- `job_title`
- `employment_type`: `FULL_TIME` | `PART_TIME` | `CONTRACT` | `INTERN`
- `employment_status`: `ACTIVE` | `ON_LEAVE` | `TERMINATED`
- `hire_date`, `termination_date` (nullable)
- `department_id` (FK, nullable)
- `manager_id` (self-FK, nullable)
- `salary` (numeric, nullable, admin-readable only)
- `created_at`, `updated_at`

### `departments`
- `id`, `name`, `slug` (unique), `description`, `head_employee_id` (FK, nullable)

Plays the same role as BoltWear's `categories`: a simple grouping admins maintain.

### `leave_types`
- `id`, `name` (e.g. "Annual", "Sick", "Unpaid"), `slug`, `default_days_per_year`, `is_paid`, `is_active`

Configurable so HR policy changes don't require migrations.

### `leave_balances`
- `id`, `employee_id`, `leave_type_id`, `year`
- `allocated_days`, `used_days`
- Unique on `(employee_id, leave_type_id, year)`
- `remaining_days` is computed (not stored), exposed via the schema

Created automatically on employee creation (one row per active leave type, current year) and on year rollover.

### `leave_requests` — analog of BoltWear's `orders`
- `id`, `employee_id`, `leave_type_id`
- `start_date`, `end_date`, `days_count` (integer; computed at creation, excludes weekends — Sat/Sun for MVP)
- `reason` (text)
- `status`: `PENDING` | `APPROVED` | `REJECTED` | `CANCELLED`
- `decided_by_user_id` (FK, nullable), `decided_at`, `decision_note`
- `created_at`

**Workflow** (mirrors `orders` status transitions):
- `PENDING` on create. Decrements nothing yet.
- Manager / admin → `APPROVED`: `leave_balances.used_days` increases by `days_count`. Employee `employment_status` flips to `ON_LEAVE` if start_date ≤ today ≤ end_date.
- Manager / admin → `REJECTED`: no balance change.
- Employee → `CANCELLED` (only while still `PENDING`): no balance change.
- Admin → cancel after approve: re-credit balance.

### `attendance_records` — analog of BoltWear's `reviews`
- `id`, `employee_id`, `date`
- `check_in_at` (timestamptz, nullable), `check_out_at` (timestamptz, nullable)
- `hours_worked` (numeric, computed at check-out)
- `status`: `PRESENT` | `ABSENT` | `LATE` | `HALF_DAY` | `ON_LEAVE`
- `note` (text, nullable — for admin corrections)
- Unique on `(employee_id, date)`

**Auto-derivations:**
- `LATE` if `check_in_at` > 09:30 local (config flag).
- `HALF_DAY` if `hours_worked` < 4.
- `ON_LEAVE` is set by a tiny derivation on read for dates covered by an approved leave request — no separate row needed.

### `announcements` (light, optional but cheap to ship)
- `id`, `title`, `body`, `posted_by_user_id`, `posted_at`

Admin-only writes. Everyone reads. Shown on the dashboard.

---

## 5. API surface

Base: `/api/v1`. Same router-assembly pattern as `BoltWear/backend/app/api/v1/router.py`.

### Auth
| Route | Method | Auth | Notes |
|-------|--------|------|-------|
| `/auth/login` | POST | — | Email + password → JWT |
| `/auth/me` | GET | user | Returns user + linked employee summary |
| `/auth/change-password` | POST | user | First-login flow + ad-hoc change |

No `/auth/register`. Employee provisioning happens through `/employees`.

### Departments
| Route | Method | Auth |
|-------|--------|------|
| `/departments` | GET | user |
| `/departments` | POST | admin |
| `/departments/{id}` | PUT / DELETE | admin |

### Employees
| Route | Method | Auth | Notes |
|-------|--------|------|-------|
| `/employees` | GET | user | Paginated; filters: `q`, `department_id`, `status`, `page`, `page_size` |
| `/employees/me` | GET | user | Own full record (with balances) |
| `/employees/me` | PUT | user | Edit own phone, address, DOB only |
| `/employees/{id}` | GET | user | Public-facing fields; sensitive fields hidden unless admin or self |
| `/employees` | POST | admin | Creates user + employee + initial leave balances; returns temp password |
| `/employees/{id}` | PUT | admin | Full edit |
| `/employees/{id}` | DELETE | admin | Soft-delete: sets status `TERMINATED`, `termination_date = today`, deactivates user |
| `/employees/{id}/reports` | GET | manager-of-id or admin | Direct reports |

### Leave types
| Route | Method | Auth |
|-------|--------|------|
| `/leave-types` | GET | user |
| `/leave-types` | POST / PUT / DELETE | admin |

### Leave balances
| Route | Method | Auth | Notes |
|-------|--------|------|-------|
| `/leave/balances/me` | GET | user | Current year balances for self |
| `/leave/balances` | GET | admin or manager (own team) | Filter by `employee_id`, `year` |
| `/leave/balances/{id}` | PUT | admin | Manual adjustment |

### Leave requests
| Route | Method | Auth | Notes |
|-------|--------|------|-------|
| `/leave/requests` | GET | user | Own; `?team=true` for managers; `?all_users=true` for admin |
| `/leave/requests` | POST | employee | Own; validates balance and date range |
| `/leave/requests/{id}` | GET | requester / their manager / admin | |
| `/leave/requests/{id}/decision` | PATCH | manager-of-requester or admin | Body: `{ status: APPROVED \| REJECTED, note? }` |
| `/leave/requests/{id}/cancel` | PATCH | requester (PENDING only) or admin (any) | Re-credits balance if was approved |

### Attendance
| Route | Method | Auth | Notes |
|-------|--------|------|-------|
| `/attendance/check-in` | POST | employee | Idempotent for today |
| `/attendance/check-out` | POST | employee | Requires existing check-in today |
| `/attendance/me` | GET | user | Own; filters `from`, `to`, defaults to current month |
| `/attendance` | GET | manager (own team) / admin | Filters: `employee_id`, `department_id`, `from`, `to` |
| `/attendance` | POST | admin | Manual entry / correction |
| `/attendance/{id}` | PUT / DELETE | admin | |

### Announcements
| Route | Method | Auth |
|-------|--------|------|
| `/announcements` | GET | user |
| `/announcements` | POST | admin |
| `/announcements/{id}` | DELETE | admin |

### Admin
| Route | Method | Auth | Notes |
|-------|--------|------|-------|
| `/admin/stats` | GET | admin | Headcount totals, headcount by department, pending leave count, today's attendance summary |
| `/admin/users` | GET | admin | List all user rows + role |

---

## 6. Frontend pages

Same Vite + React structure as `BoltWear/frontend/src/`. Pages by role:

### Public
- `/login`
- `/change-password` (forced redirect on first login)

### Employee (all roles)
- `/dashboard` — own profile card, leave balances widget, check-in / check-out card, recent announcements
- `/directory` — searchable list of active employees
- `/directory/:id` — public profile view
- `/me` — edit own contact fields
- `/leave` — own leave history + "Request leave" CTA
- `/leave/new` — request form (type, dates, reason; live remaining-days indicator)
- `/attendance` — own attendance grid for the current month

### Manager (role ≥ MANAGER)
- `/team` — list of direct reports
- `/team/leave` — pending approvals for direct reports
- `/team/attendance` — team attendance grid

### Admin (role = ADMIN)
- `/admin` — dashboard with stats from `/admin/stats`
- `/admin/employees` — full directory, filters, "New employee" CTA
- `/admin/employees/new` — provisioning form
- `/admin/employees/:id/edit` — full edit (including salary, manager, status)
- `/admin/departments` — CRUD
- `/admin/leave-types` — CRUD
- `/admin/leave` — every leave request, filterable by status
- `/admin/attendance` — every attendance record, filterable
- `/admin/announcements` — manage announcements

Routing pattern follows BoltWear's `ProtectedRoute` component, generalized to accept a `requiredRole` prop.

---

## 7. Project layout

```
hris/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── admin.py
│   │   │   ├── announcements.py
│   │   │   ├── attendance.py
│   │   │   ├── auth.py
│   │   │   ├── departments.py
│   │   │   ├── employees.py
│   │   │   ├── leave.py
│   │   │   ├── leave_types.py
│   │   │   └── router.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   ├── deps.py        # role guards: get_current_user, require_manager, require_admin
│   │   │   └── security.py
│   │   ├── models/
│   │   │   ├── announcement.py
│   │   │   ├── attendance.py
│   │   │   ├── department.py
│   │   │   ├── employee.py
│   │   │   ├── leave.py       # LeaveType, LeaveBalance, LeaveRequest
│   │   │   └── user.py
│   │   ├── schemas/
│   │   │   ├── announcement.py
│   │   │   ├── attendance.py
│   │   │   ├── auth.py
│   │   │   ├── department.py
│   │   │   ├── employee.py
│   │   │   └── leave.py
│   │   ├── services/
│   │   │   ├── leave_service.py     # balance math, approve/reject, cancel
│   │   │   └── attendance_service.py
│   │   ├── main.py
│   │   └── seed.py            # admin user + sample departments + sample employees + leave types
│   ├── alembic/
│   ├── alembic.ini
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── layout/
    │   │   ├── employee/      # EmployeeCard, EmployeeForm
    │   │   ├── leave/         # LeaveRequestCard, LeaveBalanceWidget, LeaveStatusBadge
    │   │   ├── attendance/    # AttendanceGrid, CheckInCard
    │   │   └── ui/            # shadcn primitives
    │   ├── hooks/             # useEmployees, useLeaveRequests, useAttendance, ...
    │   ├── lib/               # api client, dates, role helpers
    │   ├── pages/
    │   │   ├── admin/
    │   │   ├── manager/
    │   │   └── (employee/dashboard/etc. at top level)
    │   ├── stores/            # Zustand auth store
    │   └── types/
    ├── package.json
    └── tailwind.config.js
```

`services/` is a small departure from BoltWear — the leave-balance math and attendance status derivation are non-trivial enough to deserve their own module rather than living in route handlers.

---

## 8. Setup commands

### Prerequisites
- Python 3.11+
- Node 18+ and npm
- PostgreSQL (local or Docker)

```bash
# Optional: Postgres in Docker
docker run --name hris-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=hris -p 5432:5432 -d postgres:16
```

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate           # Windows
pip install -r requirements.txt

cp .env.example .env
# Set DATABASE_URL, SECRET_KEY, ADMIN_PASSWORD

alembic revision --autogenerate -m "initial schema"
alembic upgrade head

python -m app.seed
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install
cp .env.example .env             # VITE_API_URL=http://localhost:8000/api/v1
npm run dev
```

App: http://localhost:5173

### Default credentials (seeded)
- Admin email: `admin@hris.local`
- Admin password: from `.env` (`ChangeMe123!` default — change before seeding)

The seed script also creates:
- 3 sample departments (Engineering, People, Operations)
- 4 leave types (Annual / 20, Sick / 10, Unpaid / 0, Bereavement / 5)
- 1 manager + 2 employees per department with balances for the current year

---

## 9. Environment variables

Mirrors BoltWear's `.env` with HR-specific additions.

```
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/hris
SECRET_KEY=dev-secret-change-me
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:5173

ADMIN_EMAIL=admin@hris.local
ADMIN_PASSWORD=ChangeMe123!
ADMIN_NAME=HR Admin

# Business rules
WORKDAY_START_HOUR=9
WORKDAY_LATE_THRESHOLD_MINUTES=30
WEEKEND_DAYS=5,6                 # Sat, Sun (0=Mon)
LEAVE_YEAR_START_MONTH=1
```

---

## 10. Out of scope (deferred features)

Listed so the line is explicit. Each is a known future module, not an oversight.

- **Payroll & payslips** — money + tax + compliance is its own product.
- **Performance reviews / OKRs / 1:1s** — requires cycle scheduling and review templates.
- **Recruiting / ATS** — candidate pipeline is a different mental model than the employee directory.
- **Benefits enrollment** — carrier integrations.
- **Document storage** — contracts, IDs, certificates. Needs S3 / Cloudinary.
- **Email notifications** — leave approvals, announcement broadcasts. Plug in SES / Resend later.
- **Shift scheduling** — for shift-based businesses.
- **Project / task time tracking** — different from attendance.
- **Expense reimbursement.**
- **Training & certifications** tracking.
- **Onboarding / offboarding checklists.**
- **Org chart visualization** — `manager_id` is there; the tree view is a UI follow-up.
- **SSO** (Google / Okta / SAML).
- **Multi-tenancy / multi-company.**
- **Audit log** — who-changed-what for compliance.
- **i18n / localization.**
- **Mobile app.**

---

## 11. Build order (suggested)

A two-week-ish sequence. Each step is shippable on its own.

1. **Skeleton + auth** — repo bootstrap, FastAPI app, JWT, `User`, `/auth/login`, `/auth/me`, frontend shell, login page, Zustand auth store. (1–2 days)
2. **Departments + Employees CRUD** — backend models, admin pages, directory page. (2 days)
3. **Leave types + balances** — models, seed, admin CRUD for types, balance widget on dashboard. (1 day)
4. **Leave requests** — request form, approval flow, balance math service, manager queue. (2 days)
5. **Attendance** — check-in / check-out card, own attendance grid, manager team view, admin correction. (2 days)
6. **Announcements + admin dashboard stats** — last polish. (1 day)
7. **Seed + README + first deploy.** (0.5 day)

Total: ~10 working days for one engineer. Parallelizable across two if backend / frontend split.
