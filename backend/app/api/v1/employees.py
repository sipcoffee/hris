from datetime import date

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import AdminUser, CurrentUser, DbSession
from app.core.security import hash_password
from app.models.department import Department
from app.models.employee import Employee, EmploymentStatus
from app.models.user import User, UserRole
from app.schemas.department import DepartmentSummary
from app.services.leave_service import allocate_balances_for_employee
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeCreated,
    EmployeeListResponse,
    EmployeeOut,
    EmployeeSelfUpdate,
    EmployeeSummary,
    EmployeeUpdate,
)

router = APIRouter(prefix="/employees", tags=["employees"])


def _can_see_pii(viewer: User, employee: Employee) -> bool:
    return viewer.role == UserRole.ADMIN or viewer.id == employee.user_id


def _to_out(employee: Employee, viewer: User) -> EmployeeOut:
    pii = _can_see_pii(viewer, employee)
    return EmployeeOut(
        id=employee.id,
        user_id=employee.user_id,
        email=employee.user.email,
        role=employee.user.role,
        is_active=employee.user.is_active,
        first_name=employee.first_name,
        last_name=employee.last_name,
        job_title=employee.job_title,
        employment_type=employee.employment_type,
        employment_status=employee.employment_status,
        hire_date=employee.hire_date,
        termination_date=employee.termination_date,
        department=DepartmentSummary.model_validate(employee.department) if employee.department else None,
        manager=EmployeeSummary.model_validate(employee.manager) if employee.manager else None,
        date_of_birth=employee.date_of_birth if pii else None,
        phone=employee.phone if pii else None,
        address=employee.address if pii else None,
        salary=employee.salary if pii else None,
        created_at=employee.created_at,
        updated_at=employee.updated_at,
    )


def _load(db: Session, employee_id: int) -> Employee:
    employee = db.scalar(
        select(Employee)
        .options(
            selectinload(Employee.user),
            selectinload(Employee.department),
            selectinload(Employee.manager),
        )
        .where(Employee.id == employee_id)
    )
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return employee


def _load_self(db: Session, user: User) -> Employee:
    employee = db.scalar(
        select(Employee)
        .options(
            selectinload(Employee.user),
            selectinload(Employee.department),
            selectinload(Employee.manager),
        )
        .where(Employee.user_id == user.id)
    )
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No employee profile for this account")
    return employee


@router.get("", response_model=EmployeeListResponse)
def list_employees(
    db: DbSession,
    viewer: CurrentUser,
    q: str | None = Query(default=None),
    department_id: int | None = Query(default=None),
    employment_status: EmploymentStatus | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> EmployeeListResponse:
    stmt = select(Employee).options(
        selectinload(Employee.user),
        selectinload(Employee.department),
        selectinload(Employee.manager),
    )
    count_stmt = select(func.count(Employee.id))

    if department_id is not None:
        stmt = stmt.where(Employee.department_id == department_id)
        count_stmt = count_stmt.where(Employee.department_id == department_id)
    if employment_status is not None:
        stmt = stmt.where(Employee.employment_status == employment_status)
        count_stmt = count_stmt.where(Employee.employment_status == employment_status)
    if q:
        like = f"%{q.lower()}%"
        condition = or_(
            func.lower(Employee.first_name).like(like),
            func.lower(Employee.last_name).like(like),
            func.lower(Employee.job_title).like(like),
        )
        stmt = stmt.where(condition)
        count_stmt = count_stmt.where(condition)

    total = db.scalar(count_stmt) or 0
    stmt = stmt.order_by(Employee.first_name, Employee.last_name).offset((page - 1) * page_size).limit(page_size)
    items = list(db.scalars(stmt))
    return EmployeeListResponse(
        items=[_to_out(e, viewer) for e in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/me", response_model=EmployeeOut)
def get_me(db: DbSession, viewer: CurrentUser) -> EmployeeOut:
    employee = _load_self(db, viewer)
    return _to_out(employee, viewer)


@router.put("/me", response_model=EmployeeOut)
def update_me(payload: EmployeeSelfUpdate, db: DbSession, viewer: CurrentUser) -> EmployeeOut:
    employee = _load_self(db, viewer)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(employee, key, value)
    db.commit()
    db.refresh(employee)
    return _to_out(employee, viewer)


@router.get("/{employee_id}", response_model=EmployeeOut)
def get_employee(employee_id: int, db: DbSession, viewer: CurrentUser) -> EmployeeOut:
    employee = _load(db, employee_id)
    return _to_out(employee, viewer)


@router.get("/{employee_id}/reports", response_model=list[EmployeeOut])
def list_reports(employee_id: int, db: DbSession, viewer: CurrentUser) -> list[EmployeeOut]:
    employee = _load(db, employee_id)
    if viewer.role != UserRole.ADMIN and viewer.id != employee.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    reports = list(
        db.scalars(
            select(Employee)
            .options(
                selectinload(Employee.user),
                selectinload(Employee.department),
                selectinload(Employee.manager),
            )
            .where(Employee.manager_id == employee.id)
            .order_by(Employee.first_name, Employee.last_name)
        )
    )
    return [_to_out(r, viewer) for r in reports]


@router.post("", response_model=EmployeeCreated, status_code=status.HTTP_201_CREATED)
def create_employee(payload: EmployeeCreate, db: DbSession, admin: AdminUser) -> EmployeeCreated:
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    if payload.department_id is not None and not db.get(Department, payload.department_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Department not found")
    if payload.manager_id is not None and not db.get(Employee, payload.manager_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Manager not found")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        is_active=True,
        must_change_password=payload.must_change_password,
    )
    db.add(user)
    db.flush()

    employee = Employee(
        user_id=user.id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        job_title=payload.job_title,
        employment_type=payload.employment_type,
        employment_status=EmploymentStatus.ACTIVE,
        hire_date=payload.hire_date,
        department_id=payload.department_id,
        manager_id=payload.manager_id,
        date_of_birth=payload.date_of_birth,
        phone=payload.phone,
        address=payload.address,
        salary=payload.salary,
    )
    db.add(employee)
    db.flush()
    allocate_balances_for_employee(db, employee.id)
    db.commit()
    employee = _load(db, employee.id)
    return EmployeeCreated(employee=_to_out(employee, admin), temporary_password=payload.password)


@router.put("/{employee_id}", response_model=EmployeeOut)
def update_employee(
    employee_id: int, payload: EmployeeUpdate, db: DbSession, admin: AdminUser
) -> EmployeeOut:
    employee = _load(db, employee_id)
    data = payload.model_dump(exclude_unset=True)

    if "department_id" in data and data["department_id"] is not None:
        if not db.get(Department, data["department_id"]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Department not found")
    if "manager_id" in data and data["manager_id"] is not None:
        if data["manager_id"] == employee.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Manager cannot be self")
        if not db.get(Employee, data["manager_id"]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Manager not found")

    user_fields = {"role", "is_active"}
    for key, value in data.items():
        if key in user_fields:
            setattr(employee.user, key, value)
        else:
            setattr(employee, key, value)

    db.commit()
    employee = _load(db, employee.id)
    return _to_out(employee, admin)


@router.delete("/{employee_id}", response_model=EmployeeOut)
def terminate_employee(employee_id: int, db: DbSession, admin: AdminUser) -> EmployeeOut:
    employee = _load(db, employee_id)
    if employee.user_id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot terminate yourself")

    employee.employment_status = EmploymentStatus.TERMINATED
    employee.termination_date = date.today()
    employee.user.is_active = False

    db.execute(
        Department.__table__.update()
        .where(Department.head_employee_id == employee.id)
        .values(head_employee_id=None)
    )

    db.commit()
    employee = _load(db, employee.id)
    return _to_out(employee, admin)
