from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.attendance import AttendanceStatus
from app.models.leave import LeaveRequest, LeaveStatus


def derive_status_from_check_in(
    check_in: datetime, start_hour: int, late_threshold_minute: int
) -> AttendanceStatus:
    """LATE if the check-in time is past the configured workday-start threshold."""
    if (check_in.hour, check_in.minute) > (start_hour, late_threshold_minute):
        return AttendanceStatus.LATE
    return AttendanceStatus.PRESENT


def compute_hours_worked(check_in: datetime, check_out: datetime) -> Decimal:
    """Decimal hours between check-in and check-out, quantized to 0.01."""
    delta = check_out - check_in
    seconds = max(delta.total_seconds(), 0)
    hours = Decimal(seconds) / Decimal(3600)
    return hours.quantize(Decimal("0.01"))


def apply_half_day(hours_worked: Decimal, current: AttendanceStatus) -> AttendanceStatus:
    """Demote PRESENT/LATE to HALF_DAY if hours fell below 4."""
    if current in (AttendanceStatus.PRESENT, AttendanceStatus.LATE) and hours_worked < Decimal("4"):
        return AttendanceStatus.HALF_DAY
    return current


def leave_override_dates(
    db: Session, employee_ids: list[int], start: date, end: date
) -> set[tuple[int, date]]:
    """Return (employee_id, date) pairs that fall inside an APPROVED leave request.

    Used to override an attendance record's reported status to ON_LEAVE on read.
    """
    if not employee_ids or end < start:
        return set()
    requests = list(
        db.scalars(
            select(LeaveRequest)
            .where(LeaveRequest.employee_id.in_(employee_ids))
            .where(LeaveRequest.status == LeaveStatus.APPROVED)
            .where(LeaveRequest.start_date <= end)
            .where(LeaveRequest.end_date >= start)
        )
    )
    overrides: set[tuple[int, date]] = set()
    for r in requests:
        cursor = max(r.start_date, start)
        last = min(r.end_date, end)
        while cursor <= last:
            overrides.add((r.employee_id, cursor))
            cursor += timedelta(days=1)
    return overrides
