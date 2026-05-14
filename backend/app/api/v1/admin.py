from datetime import date

from fastapi import APIRouter
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import AdminUser, DbSession
from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.models.department import Department
from app.models.employee import Employee, EmploymentStatus
from app.models.leave import LeaveRequest, LeaveStatus
from app.models.user import User
from app.schemas.admin import (
    AdminStats,
    AdminUserOut,
    HeadcountStats,
    StatsByDepartment,
    TodayAttendanceStats,
)
from app.services.attendance_service import leave_override_dates

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStats)
def get_stats(db: DbSession, _: AdminUser) -> AdminStats:
    # Headcount by status — count every row.
    status_rows = db.execute(
        select(Employee.employment_status, func.count(Employee.id)).group_by(Employee.employment_status)
    ).all()
    by_status = {s.value: int(c) for s, c in status_rows}
    for s in EmploymentStatus:
        by_status.setdefault(s.value, 0)
    total_active = by_status.get(EmploymentStatus.ACTIVE.value, 0)

    # Active headcount by department.
    dept_rows = db.execute(
        select(
            Employee.department_id,
            Department.name,
            func.count(Employee.id),
        )
        .join(Department, Department.id == Employee.department_id, isouter=True)
        .where(Employee.employment_status == EmploymentStatus.ACTIVE)
        .group_by(Employee.department_id, Department.name)
        .order_by(Department.name)
    ).all()
    by_department = [
        StatsByDepartment(
            department_id=dept_id,
            department_name=name or "Unassigned",
            count=int(count),
        )
        for dept_id, name, count in dept_rows
    ]

    pending_leave_count = (
        db.scalar(
            select(func.count(LeaveRequest.id)).where(LeaveRequest.status == LeaveStatus.PENDING)
        )
        or 0
    )

    # Today's attendance summary, with ON_LEAVE overlay.
    today = date.today()
    active_employees = list(
        db.scalars(
            select(Employee).where(Employee.employment_status == EmploymentStatus.ACTIVE)
        )
    )
    active_ids = [e.id for e in active_employees]
    leave_set = leave_override_dates(db, active_ids, today, today)
    records: dict[int, AttendanceRecord] = {}
    if active_ids:
        for r in db.scalars(
            select(AttendanceRecord)
            .where(AttendanceRecord.employee_id.in_(active_ids))
            .where(AttendanceRecord.date == today)
        ):
            records[r.employee_id] = r

    counts = {"present": 0, "late": 0, "half_day": 0, "on_leave": 0, "not_checked_in": 0}
    for emp in active_employees:
        if (emp.id, today) in leave_set:
            counts["on_leave"] += 1
            continue
        rec = records.get(emp.id)
        if rec is None or rec.check_in_at is None:
            counts["not_checked_in"] += 1
        elif rec.status == AttendanceStatus.LATE:
            counts["late"] += 1
        elif rec.status == AttendanceStatus.HALF_DAY:
            counts["half_day"] += 1
        else:
            counts["present"] += 1

    return AdminStats(
        headcount=HeadcountStats(
            total_active=total_active,
            by_status=by_status,
            by_department=by_department,
        ),
        pending_leave_count=int(pending_leave_count),
        today_attendance=TodayAttendanceStats(**counts),
    )


@router.get("/users", response_model=list[AdminUserOut])
def list_users(db: DbSession, _: AdminUser) -> list[AdminUserOut]:
    users = list(
        db.scalars(
            select(User)
            .options(selectinload(User.employee))
            .order_by(User.email)
        )
    )
    out: list[AdminUserOut] = []
    for u in users:
        full_name: str | None = None
        if u.employee:
            full_name = f"{u.employee.first_name} {u.employee.last_name}".strip()
        out.append(
            AdminUserOut(
                id=u.id,
                email=u.email,
                role=u.role,
                is_active=u.is_active,
                must_change_password=u.must_change_password,
                created_at=u.created_at,
                employee_name=full_name,
            )
        )
    return out
