from fastapi import APIRouter, HTTPException, status
from slugify import slugify
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import AdminUser, CurrentUser, DbSession
from app.models.leave import LeaveBalance, LeaveType
from app.schemas.leave import LeaveTypeCreate, LeaveTypeOut, LeaveTypeUpdate

router = APIRouter(prefix="/leave-types", tags=["leave-types"])


def _unique_slug(db: Session, name: str, ignore_id: int | None = None) -> str:
    base = slugify(name) or "leave"
    candidate = base
    n = 1
    while True:
        stmt = select(LeaveType).where(LeaveType.slug == candidate)
        if ignore_id is not None:
            stmt = stmt.where(LeaveType.id != ignore_id)
        if db.scalar(stmt) is None:
            return candidate
        n += 1
        candidate = f"{base}-{n}"


@router.get("", response_model=list[LeaveTypeOut])
def list_leave_types(db: DbSession, _: CurrentUser) -> list[LeaveType]:
    return list(db.scalars(select(LeaveType).order_by(LeaveType.name)))


@router.post("", response_model=LeaveTypeOut, status_code=status.HTTP_201_CREATED)
def create_leave_type(payload: LeaveTypeCreate, db: DbSession, _: AdminUser) -> LeaveType:
    lt = LeaveType(
        name=payload.name,
        slug=_unique_slug(db, payload.name),
        default_days_per_year=payload.default_days_per_year,
        is_paid=payload.is_paid,
        is_active=payload.is_active,
    )
    db.add(lt)
    db.commit()
    db.refresh(lt)
    return lt


@router.put("/{leave_type_id}", response_model=LeaveTypeOut)
def update_leave_type(
    leave_type_id: int, payload: LeaveTypeUpdate, db: DbSession, _: AdminUser
) -> LeaveType:
    lt = db.get(LeaveType, leave_type_id)
    if not lt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave type not found")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] != lt.name:
        lt.name = data["name"]
        lt.slug = _unique_slug(db, data["name"], ignore_id=lt.id)
    for key in ("default_days_per_year", "is_paid", "is_active"):
        if key in data:
            setattr(lt, key, data[key])
    db.commit()
    db.refresh(lt)
    return lt


@router.delete("/{leave_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_leave_type(leave_type_id: int, db: DbSession, _: AdminUser) -> None:
    lt = db.get(LeaveType, leave_type_id)
    if not lt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave type not found")
    in_use = db.scalar(
        select(func.count(LeaveBalance.id)).where(LeaveBalance.leave_type_id == lt.id)
    )
    if in_use:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Leave type has balances. Deactivate it instead (set is_active=false).",
        )
    db.delete(lt)
    db.commit()
