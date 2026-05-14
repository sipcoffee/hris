from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import CurrentUser, DbSession
from app.models.employee import Employee
from app.models.leave import LeaveRequest, LeaveStatus, LeaveType
from app.models.user import User, UserRole
from app.schemas.leave import (
    LeaveCancelIn,
    LeaveDecisionIn,
    LeaveRequestCreate,
    LeaveRequestOut,
)
from app.services.leave_service import business_days_between, find_balance

router = APIRouter(prefix="/leave/requests", tags=["leave-requests"])


def _load(db: Session, request_id: int) -> LeaveRequest:
    req = db.scalar(
        select(LeaveRequest)
        .options(
            selectinload(LeaveRequest.employee),
            selectinload(LeaveRequest.leave_type),
            selectinload(LeaveRequest.decided_by),
        )
        .where(LeaveRequest.id == request_id)
    )
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")
    return req


def _employee_for(db: Session, user: User) -> Employee | None:
    return db.scalar(select(Employee).where(Employee.user_id == user.id))


def _can_view(viewer: User, request: LeaveRequest, viewer_employee: Employee | None) -> bool:
    if viewer.role == UserRole.ADMIN:
        return True
    if viewer_employee and request.employee_id == viewer_employee.id:
        return True
    if viewer_employee and request.employee.manager_id == viewer_employee.id:
        return True
    return False


def _can_decide(viewer: User, request: LeaveRequest, viewer_employee: Employee | None) -> bool:
    if viewer.role == UserRole.ADMIN:
        return True
    if viewer_employee and request.employee.manager_id == viewer_employee.id:
        return True
    return False


@router.get("", response_model=list[LeaveRequestOut])
def list_requests(
    db: DbSession,
    viewer: CurrentUser,
    team: bool = Query(default=False),
    all_users: bool = Query(default=False),
    status_filter: LeaveStatus | None = Query(default=None, alias="status"),
) -> list[LeaveRequest]:
    viewer_employee = _employee_for(db, viewer)
    stmt = (
        select(LeaveRequest)
        .options(
            selectinload(LeaveRequest.employee),
            selectinload(LeaveRequest.leave_type),
            selectinload(LeaveRequest.decided_by),
        )
        .order_by(LeaveRequest.created_at.desc())
    )

    if all_users:
        if viewer.role != UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    elif team:
        if not viewer_employee:
            return []
        if viewer.role == UserRole.EMPLOYEE:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager access required")
        # Filter by employees whose manager_id == viewer_employee.id
        reports = select(Employee.id).where(Employee.manager_id == viewer_employee.id)
        stmt = stmt.where(LeaveRequest.employee_id.in_(reports))
    else:
        if not viewer_employee:
            return []
        stmt = stmt.where(LeaveRequest.employee_id == viewer_employee.id)

    if status_filter is not None:
        stmt = stmt.where(LeaveRequest.status == status_filter)

    return list(db.scalars(stmt))


@router.get("/{request_id}", response_model=LeaveRequestOut)
def get_request(request_id: int, db: DbSession, viewer: CurrentUser) -> LeaveRequest:
    req = _load(db, request_id)
    viewer_employee = _employee_for(db, viewer)
    if not _can_view(viewer, req, viewer_employee):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return req


@router.post("", response_model=LeaveRequestOut, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: LeaveRequestCreate, db: DbSession, viewer: CurrentUser
) -> LeaveRequest:
    employee = _employee_for(db, viewer)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No employee profile is linked to this account",
        )
    if payload.end_date < payload.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="end_date cannot be before start_date"
        )
    if payload.start_date.year != payload.end_date.year:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Requests spanning calendar years are not supported. Split into two requests.",
        )

    leave_type = db.get(LeaveType, payload.leave_type_id)
    if not leave_type or not leave_type.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Leave type not available"
        )

    days_count = business_days_between(payload.start_date, payload.end_date)
    if days_count <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected range contains no business days",
        )

    overlap = db.scalar(
        select(LeaveRequest.id)
        .where(LeaveRequest.employee_id == employee.id)
        .where(LeaveRequest.status.in_([LeaveStatus.PENDING, LeaveStatus.APPROVED]))
        .where(
            and_(
                LeaveRequest.start_date <= payload.end_date,
                LeaveRequest.end_date >= payload.start_date,
            )
        )
    )
    if overlap:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Overlaps an existing pending or approved request",
        )

    balance = find_balance(db, employee.id, leave_type.id, payload.start_date.year)
    if not balance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No balance allocated for this leave type in this year",
        )
    if leave_type.is_paid and balance.remaining_days < Decimal(days_count):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient balance: {balance.remaining_days} day(s) remaining, {days_count} requested",
        )

    request = LeaveRequest(
        employee_id=employee.id,
        leave_type_id=leave_type.id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        days_count=days_count,
        reason=payload.reason,
        status=LeaveStatus.PENDING,
    )
    db.add(request)
    db.commit()
    return _load(db, request.id)


@router.patch("/{request_id}/decision", response_model=LeaveRequestOut)
def decide_request(
    request_id: int, payload: LeaveDecisionIn, db: DbSession, viewer: CurrentUser
) -> LeaveRequest:
    req = _load(db, request_id)
    viewer_employee = _employee_for(db, viewer)
    if not _can_decide(viewer, req, viewer_employee):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    if req.status != LeaveStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Only PENDING requests can be decided (current: {req.status.value})",
        )

    new_status = LeaveStatus(payload.status)
    if new_status == LeaveStatus.APPROVED:
        balance = find_balance(db, req.employee_id, req.leave_type_id, req.start_date.year)
        if not balance:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No balance row for this employee/type/year",
            )
        if req.leave_type.is_paid and balance.remaining_days < Decimal(req.days_count):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Balance has dropped below the requested days since this request was filed",
            )
        balance.used_days = Decimal(balance.used_days) + Decimal(req.days_count)

    req.status = new_status
    req.decided_by_user_id = viewer.id
    req.decided_at = datetime.now(timezone.utc)
    req.decision_note = payload.note

    db.commit()
    return _load(db, req.id)


@router.patch("/{request_id}/cancel", response_model=LeaveRequestOut)
def cancel_request(
    request_id: int, payload: LeaveCancelIn, db: DbSession, viewer: CurrentUser
) -> LeaveRequest:
    req = _load(db, request_id)
    viewer_employee = _employee_for(db, viewer)

    is_requester = viewer_employee is not None and req.employee_id == viewer_employee.id
    is_admin = viewer.role == UserRole.ADMIN

    if not (is_admin or is_requester):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    if req.status in (LeaveStatus.REJECTED, LeaveStatus.CANCELLED):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot cancel a {req.status.value.lower()} request",
        )

    if is_requester and not is_admin and req.status != LeaveStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You can only cancel a request that is still pending. Ask your manager or HR.",
        )

    if req.status == LeaveStatus.APPROVED:
        balance = find_balance(db, req.employee_id, req.leave_type_id, req.start_date.year)
        if balance is not None and req.leave_type.is_paid:
            new_used = Decimal(balance.used_days) - Decimal(req.days_count)
            balance.used_days = new_used if new_used >= 0 else Decimal("0")

    req.status = LeaveStatus.CANCELLED
    req.decided_by_user_id = viewer.id
    req.decided_at = datetime.now(timezone.utc)
    if payload.note:
        req.decision_note = payload.note

    db.commit()
    return _load(db, req.id)
