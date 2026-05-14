from fastapi import APIRouter, HTTPException, status
from slugify import slugify
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import AdminUser, CurrentUser, DbSession
from app.models.department import Department
from app.models.employee import Employee
from app.schemas.department import DepartmentCreate, DepartmentOut, DepartmentUpdate

router = APIRouter(prefix="/departments", tags=["departments"])


def _unique_slug(db: Session, name: str, ignore_id: int | None = None) -> str:
    base = slugify(name) or "department"
    candidate = base
    n = 1
    while True:
        stmt = select(Department).where(Department.slug == candidate)
        if ignore_id is not None:
            stmt = stmt.where(Department.id != ignore_id)
        if db.scalar(stmt) is None:
            return candidate
        n += 1
        candidate = f"{base}-{n}"


def _serialize(db: Session, departments: list[Department]) -> list[DepartmentOut]:
    if not departments:
        return []
    ids = [d.id for d in departments]
    counts = dict(
        db.execute(
            select(Employee.department_id, func.count(Employee.id))
            .where(Employee.department_id.in_(ids))
            .group_by(Employee.department_id)
        ).all()
    )
    return [
        DepartmentOut.model_validate(d).model_copy(update={"employee_count": int(counts.get(d.id, 0))})
        for d in departments
    ]


@router.get("", response_model=list[DepartmentOut])
def list_departments(db: DbSession, _: CurrentUser) -> list[DepartmentOut]:
    departments = list(
        db.scalars(
            select(Department)
            .options(selectinload(Department.head_employee))
            .order_by(Department.name)
        )
    )
    return _serialize(db, departments)


@router.post("", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(payload: DepartmentCreate, db: DbSession, _: AdminUser) -> DepartmentOut:
    if payload.head_employee_id is not None and not db.get(Employee, payload.head_employee_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Head employee not found")
    department = Department(
        name=payload.name,
        description=payload.description,
        slug=_unique_slug(db, payload.name),
        head_employee_id=payload.head_employee_id,
    )
    db.add(department)
    db.commit()
    db.refresh(department)
    return _serialize(db, [department])[0]


@router.put("/{department_id}", response_model=DepartmentOut)
def update_department(
    department_id: int, payload: DepartmentUpdate, db: DbSession, _: AdminUser
) -> DepartmentOut:
    department = db.get(Department, department_id)
    if not department:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] != department.name:
        department.name = data["name"]
        department.slug = _unique_slug(db, data["name"], ignore_id=department.id)
    if "description" in data:
        department.description = data["description"]
    if "head_employee_id" in data:
        new_head = data["head_employee_id"]
        if new_head is not None and not db.get(Employee, new_head):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Head employee not found")
        department.head_employee_id = new_head
    db.commit()
    db.refresh(department)
    return _serialize(db, [department])[0]


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(department_id: int, db: DbSession, _: AdminUser) -> None:
    department = db.get(Department, department_id)
    if not department:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    in_use = db.scalar(
        select(func.count(Employee.id)).where(Employee.department_id == department.id)
    )
    if in_use:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete department with employees. Reassign employees first.",
        )
    db.delete(department)
    db.commit()
