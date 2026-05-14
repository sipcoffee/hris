from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import AdminUser, CurrentUser, DbSession, ManagerUser
from app.core.config import settings
from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.models.employee import Employee
from app.models.user import User, UserRole
from app.schemas.attendance import AttendanceCreate, AttendanceOut, AttendanceUpdate
from app.services.attendance_service import (
    apply_half_day,
    compute_hours_worked,
    derive_status_from_check_in,
    leave_override_dates,
)

router = APIRouter(prefix="/attendance", tags=["attendance"])


def _employee_for(db: Session, user: User) -> Employee | None:
    return db.scalar(select(Employee).where(Employee.user_id == user.id))


def _month_bounds(today: date | None = None) -> tuple[date, date]:
    today = today or date.today()
    start = today.replace(day=1)
    if start.month == 12:
        next_month = start.replace(year=start.year + 1, month=1)
    else:
        next_month = start.replace(month=start.month + 1)
    end = next_month - timedelta(days=1)
    return start, end


def _load(db: Session, record_id: int) -> AttendanceRecord:
    record = db.scalar(
        select(AttendanceRecord)
        .options(selectinload(AttendanceRecord.employee))
        .where(AttendanceRecord.id == record_id)
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")
    return record


def _serialize(
    db: Session, records: list[AttendanceRecord], start: date, end: date
) -> list[AttendanceOut]:
    if not records:
        return []
    overrides = leave_override_dates(db, [r.employee_id for r in records], start, end)
    out: list[AttendanceOut] = []
    for r in records:
        item = AttendanceOut.model_validate(r)
        if (r.employee_id, r.date) in overrides:
            item = item.model_copy(update={"status": AttendanceStatus.ON_LEAVE})
        out.append(item)
    return out


def _apply_status_recompute(record: AttendanceRecord) -> None:
    if record.check_in_at is None:
        if record.status not in (AttendanceStatus.ABSENT, AttendanceStatus.ON_LEAVE):
            record.status = AttendanceStatus.ABSENT
        record.hours_worked = None
        return
    base = derive_status_from_check_in(
        record.check_in_at,
        settings.WORKDAY_START_HOUR,
        settings.WORKDAY_LATE_THRESHOLD_MINUTES,
    )
    if record.check_out_at is not None:
        record.hours_worked = compute_hours_worked(record.check_in_at, record.check_out_at)
        record.status = apply_half_day(record.hours_worked, base)
    else:
        record.hours_worked = None
        record.status = base


@router.post("/check-in", response_model=AttendanceOut)
def check_in(db: DbSession, viewer: CurrentUser) -> AttendanceOut:
    employee = _employee_for(db, viewer)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No employee profile is linked to this account",
        )
    today = date.today()
    record = db.scalar(
        select(AttendanceRecord)
        .options(selectinload(AttendanceRecord.employee))
        .where(AttendanceRecord.employee_id == employee.id)
        .where(AttendanceRecord.date == today)
    )
    now = datetime.now(timezone.utc)
    if record is None:
        record = AttendanceRecord(
            employee_id=employee.id,
            date=today,
            check_in_at=now,
        )
        _apply_status_recompute(record)
        db.add(record)
    elif record.check_in_at is None:
        record.check_in_at = now
        _apply_status_recompute(record)
    # else: idempotent — already checked in today.

    db.commit()
    record = _load(db, record.id)
    return _serialize(db, [record], today, today)[0]


@router.post("/check-out", response_model=AttendanceOut)
def check_out(db: DbSession, viewer: CurrentUser) -> AttendanceOut:
    employee = _employee_for(db, viewer)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No employee profile is linked to this account",
        )
    today = date.today()
    record = db.scalar(
        select(AttendanceRecord)
        .options(selectinload(AttendanceRecord.employee))
        .where(AttendanceRecord.employee_id == employee.id)
        .where(AttendanceRecord.date == today)
    )
    if record is None or record.check_in_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You haven't checked in yet today",
        )
    record.check_out_at = datetime.now(timezone.utc)
    _apply_status_recompute(record)
    db.commit()
    record = _load(db, record.id)
    return _serialize(db, [record], today, today)[0]


@router.get("/me", response_model=list[AttendanceOut])
def my_attendance(
    db: DbSession,
    viewer: CurrentUser,
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
) -> list[AttendanceOut]:
    employee = _employee_for(db, viewer)
    if not employee:
        return []
    if from_date is None or to_date is None:
        start, end = _month_bounds()
    else:
        start, end = from_date, to_date
    records = list(
        db.scalars(
            select(AttendanceRecord)
            .options(selectinload(AttendanceRecord.employee))
            .where(AttendanceRecord.employee_id == employee.id)
            .where(AttendanceRecord.date >= start)
            .where(AttendanceRecord.date <= end)
            .order_by(AttendanceRecord.date.desc())
        )
    )
    return _serialize(db, records, start, end)


@router.get("", response_model=list[AttendanceOut])
def list_attendance(
    db: DbSession,
    viewer: ManagerUser,
    employee_id: int | None = Query(default=None),
    department_id: int | None = Query(default=None),
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
) -> list[AttendanceOut]:
    if from_date is None or to_date is None:
        start, end = _month_bounds()
    else:
        start, end = from_date, to_date

    stmt = (
        select(AttendanceRecord)
        .options(selectinload(AttendanceRecord.employee))
        .where(AttendanceRecord.date >= start)
        .where(AttendanceRecord.date <= end)
        .order_by(AttendanceRecord.date.desc(), AttendanceRecord.employee_id)
    )

    if viewer.role == UserRole.MANAGER:
        viewer_employee = _employee_for(db, viewer)
        if not viewer_employee:
            return []
        # Limit to direct reports.
        reports = select(Employee.id).where(Employee.manager_id == viewer_employee.id)
        stmt = stmt.where(AttendanceRecord.employee_id.in_(reports))

    if employee_id is not None:
        stmt = stmt.where(AttendanceRecord.employee_id == employee_id)

    if department_id is not None:
        emp_ids = select(Employee.id).where(Employee.department_id == department_id)
        stmt = stmt.where(AttendanceRecord.employee_id.in_(emp_ids))

    records = list(db.scalars(stmt))
    return _serialize(db, records, start, end)


@router.post("", response_model=AttendanceOut, status_code=status.HTTP_201_CREATED)
def create_attendance(
    payload: AttendanceCreate, db: DbSession, _: AdminUser
) -> AttendanceOut:
    if not db.get(Employee, payload.employee_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee not found")
    existing = db.scalar(
        select(AttendanceRecord)
        .where(AttendanceRecord.employee_id == payload.employee_id)
        .where(AttendanceRecord.date == payload.date)
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Attendance record already exists for this employee and date",
        )

    record = AttendanceRecord(
        employee_id=payload.employee_id,
        date=payload.date,
        check_in_at=payload.check_in_at,
        check_out_at=payload.check_out_at,
        note=payload.note,
    )
    _apply_status_recompute(record)
    if payload.status is not None:
        record.status = payload.status
    db.add(record)
    db.commit()
    record = _load(db, record.id)
    return _serialize(db, [record], record.date, record.date)[0]


@router.put("/{record_id}", response_model=AttendanceOut)
def update_attendance(
    record_id: int, payload: AttendanceUpdate, db: DbSession, _: AdminUser
) -> AttendanceOut:
    record = _load(db, record_id)
    data = payload.model_dump(exclude_unset=True)

    if "check_in_at" in data:
        record.check_in_at = data["check_in_at"]
    if "check_out_at" in data:
        record.check_out_at = data["check_out_at"]
    if "note" in data:
        record.note = data["note"]

    _apply_status_recompute(record)
    if "status" in data and data["status"] is not None:
        record.status = data["status"]

    db.commit()
    record = _load(db, record.id)
    return _serialize(db, [record], record.date, record.date)[0]


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attendance(record_id: int, db: DbSession, _: AdminUser) -> None:
    record = _load(db, record_id)
    db.delete(record)
    db.commit()
