from datetime import date

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import AdminUser, CurrentUser, DbSession
from app.models.employee import Employee
from app.models.leave import LeaveBalance
from app.schemas.leave import LeaveBalanceAdjust, LeaveBalanceOut

router = APIRouter(prefix="/leave/balances", tags=["leave-balances"])


@router.get("/me", response_model=list[LeaveBalanceOut])
def my_balances(
    db: DbSession,
    viewer: CurrentUser,
    year: int | None = Query(default=None),
) -> list[LeaveBalance]:
    target_year = year or date.today().year
    employee = db.scalar(select(Employee).where(Employee.user_id == viewer.id))
    if not employee:
        return []
    return list(
        db.scalars(
            select(LeaveBalance)
            .options(selectinload(LeaveBalance.leave_type))
            .where(LeaveBalance.employee_id == employee.id, LeaveBalance.year == target_year)
            .order_by(LeaveBalance.id)
        )
    )


@router.get("", response_model=list[LeaveBalanceOut])
def list_balances(
    db: DbSession,
    _: AdminUser,
    employee_id: int | None = Query(default=None),
    year: int | None = Query(default=None),
) -> list[LeaveBalance]:
    target_year = year or date.today().year
    stmt = (
        select(LeaveBalance)
        .options(selectinload(LeaveBalance.leave_type))
        .where(LeaveBalance.year == target_year)
        .order_by(LeaveBalance.employee_id, LeaveBalance.id)
    )
    if employee_id is not None:
        stmt = stmt.where(LeaveBalance.employee_id == employee_id)
    return list(db.scalars(stmt))


@router.put("/{balance_id}", response_model=LeaveBalanceOut)
def adjust_balance(
    balance_id: int, payload: LeaveBalanceAdjust, db: DbSession, _: AdminUser
) -> LeaveBalance:
    balance = db.scalar(
        select(LeaveBalance)
        .options(selectinload(LeaveBalance.leave_type))
        .where(LeaveBalance.id == balance_id)
    )
    if not balance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Balance not found")
    data = payload.model_dump(exclude_unset=True)
    if "allocated_days" in data and data["allocated_days"] is not None:
        balance.allocated_days = data["allocated_days"]
    if "used_days" in data and data["used_days"] is not None:
        balance.used_days = data["used_days"]
    db.commit()
    db.refresh(balance)
    return balance
