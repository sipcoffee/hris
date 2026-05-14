from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.leave import LeaveBalance, LeaveType


def allocate_balances_for_employee(
    db: Session, employee_id: int, year: int | None = None
) -> list[LeaveBalance]:
    """Ensure the employee has a LeaveBalance for each active LeaveType for the given year.

    Idempotent — skips combinations that already exist. Does not commit.
    """
    target_year = year or date.today().year
    active_types = list(db.scalars(select(LeaveType).where(LeaveType.is_active.is_(True))))
    existing = set(
        db.scalars(
            select(LeaveBalance.leave_type_id)
            .where(LeaveBalance.employee_id == employee_id)
            .where(LeaveBalance.year == target_year)
        ).all()
    )
    created: list[LeaveBalance] = []
    for lt in active_types:
        if lt.id in existing:
            continue
        balance = LeaveBalance(
            employee_id=employee_id,
            leave_type_id=lt.id,
            year=target_year,
            allocated_days=lt.default_days_per_year,
            used_days=Decimal("0"),
        )
        db.add(balance)
        created.append(balance)
    return created
