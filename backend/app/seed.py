"""Seed the database with the admin user, sample departments, employees, and leave types.

Run with: python -m app.seed
"""
from datetime import date
from decimal import Decimal

from slugify import slugify
from sqlalchemy import select

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.department import Department
from app.models.employee import Employee, EmploymentStatus, EmploymentType
from app.models.leave import LeaveType
from app.models.user import User, UserRole
from app.services.leave_service import allocate_balances_for_employee

SAMPLE_DEPARTMENTS = [
    {"name": "Engineering", "description": "Builders of the product."},
    {"name": "People", "description": "HR, recruiting, and culture."},
    {"name": "Operations", "description": "Finance, IT, and facilities."},
]

SAMPLE_PEOPLE: dict[str, list[dict]] = {
    "Engineering": [
        {"email": "sarah.chen@hris.local", "first": "Sarah", "last": "Chen", "title": "Engineering Lead", "manager": True},
        {"email": "alex.kumar@hris.local", "first": "Alex", "last": "Kumar", "title": "Senior Engineer", "manager": False},
        {"email": "jordan.lee@hris.local", "first": "Jordan", "last": "Lee", "title": "Engineer", "manager": False},
    ],
    "People": [
        {"email": "robin.cole@hris.local", "first": "Robin", "last": "Cole", "title": "People Lead", "manager": True},
        {"email": "pat.mendez@hris.local", "first": "Pat", "last": "Mendez", "title": "HR Partner", "manager": False},
        {"email": "sam.yi@hris.local", "first": "Sam", "last": "Yi", "title": "Recruiter", "manager": False},
    ],
    "Operations": [
        {"email": "taylor.ross@hris.local", "first": "Taylor", "last": "Ross", "title": "Operations Lead", "manager": True},
        {"email": "casey.park@hris.local", "first": "Casey", "last": "Park", "title": "Office Manager", "manager": False},
        {"email": "drew.singh@hris.local", "first": "Drew", "last": "Singh", "title": "IT Specialist", "manager": False},
    ],
}

SAMPLE_LEAVE_TYPES = [
    {"name": "Annual", "default_days_per_year": Decimal("20"), "is_paid": True},
    {"name": "Sick", "default_days_per_year": Decimal("10"), "is_paid": True},
    {"name": "Unpaid", "default_days_per_year": Decimal("0"), "is_paid": False},
    {"name": "Bereavement", "default_days_per_year": Decimal("5"), "is_paid": True},
]

DEFAULT_EMPLOYEE_PASSWORD = "ChangeMe123!"


def main() -> None:
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        admin = db.scalar(select(User).where(User.email == settings.ADMIN_EMAIL))
        if not admin:
            admin = User(
                email=settings.ADMIN_EMAIL,
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
                role=UserRole.ADMIN,
                is_active=True,
                must_change_password=False,
            )
            db.add(admin)
            db.flush()
            print(f"Created admin: {settings.ADMIN_EMAIL}")
        else:
            print(f"Admin already exists: {settings.ADMIN_EMAIL}")

        for lt in SAMPLE_LEAVE_TYPES:
            existing = db.scalar(select(LeaveType).where(LeaveType.name == lt["name"]))
            if existing:
                continue
            db.add(
                LeaveType(
                    name=lt["name"],
                    slug=slugify(lt["name"]),
                    default_days_per_year=lt["default_days_per_year"],
                    is_paid=lt["is_paid"],
                    is_active=True,
                )
            )
            print(f"Created leave type: {lt['name']}")
        db.flush()

        dept_map: dict[str, Department] = {}
        for d in SAMPLE_DEPARTMENTS:
            existing = db.scalar(select(Department).where(Department.name == d["name"]))
            if existing:
                dept_map[d["name"]] = existing
                continue
            dept = Department(name=d["name"], description=d["description"], slug=slugify(d["name"]))
            db.add(dept)
            db.flush()
            dept_map[d["name"]] = dept
            print(f"Created department: {d['name']}")

        hire = date.today()
        new_employee_ids: list[int] = []
        for dept_name, people in SAMPLE_PEOPLE.items():
            dept = dept_map[dept_name]
            manager_employee: Employee | None = None

            for person in people:
                existing_user = db.scalar(select(User).where(User.email == person["email"]))
                if existing_user:
                    continue
                role = UserRole.MANAGER if person["manager"] else UserRole.EMPLOYEE
                user = User(
                    email=person["email"],
                    hashed_password=hash_password(DEFAULT_EMPLOYEE_PASSWORD),
                    role=role,
                    is_active=True,
                    must_change_password=True,
                )
                db.add(user)
                db.flush()
                employee = Employee(
                    user_id=user.id,
                    first_name=person["first"],
                    last_name=person["last"],
                    job_title=person["title"],
                    employment_type=EmploymentType.FULL_TIME,
                    employment_status=EmploymentStatus.ACTIVE,
                    hire_date=hire,
                    department_id=dept.id,
                )
                db.add(employee)
                db.flush()
                new_employee_ids.append(employee.id)
                if person["manager"]:
                    manager_employee = employee
                    dept.head_employee_id = employee.id
                print(f"  Created {role.value}: {person['email']}")

            if manager_employee:
                db.execute(
                    Employee.__table__.update()
                    .where(Employee.department_id == dept.id)
                    .where(Employee.id != manager_employee.id)
                    .values(manager_id=manager_employee.id)
                )

        # Allocate current-year leave balances for every employee (idempotent).
        for emp_id in db.scalars(select(Employee.id)).all():
            allocate_balances_for_employee(db, emp_id)

        db.commit()
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
