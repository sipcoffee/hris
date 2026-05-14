from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.employee import EmploymentStatus, EmploymentType
from app.models.user import UserRole
from app.schemas.department import DepartmentSummary


class EmployeeSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    job_title: str


class EmployeeCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.EMPLOYEE
    must_change_password: bool = True

    first_name: str = Field(min_length=1, max_length=120)
    last_name: str = Field(min_length=1, max_length=120)
    job_title: str = Field(min_length=1, max_length=160)
    employment_type: EmploymentType = EmploymentType.FULL_TIME
    hire_date: date
    department_id: int | None = None
    manager_id: int | None = None

    date_of_birth: date | None = None
    phone: str | None = Field(default=None, max_length=40)
    address: str | None = None
    salary: Decimal | None = Field(default=None, ge=0)


class EmployeeUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=120)
    last_name: str | None = Field(default=None, min_length=1, max_length=120)
    job_title: str | None = Field(default=None, min_length=1, max_length=160)
    employment_type: EmploymentType | None = None
    employment_status: EmploymentStatus | None = None
    hire_date: date | None = None
    termination_date: date | None = None
    department_id: int | None = None
    manager_id: int | None = None
    date_of_birth: date | None = None
    phone: str | None = Field(default=None, max_length=40)
    address: str | None = None
    salary: Decimal | None = Field(default=None, ge=0)
    role: UserRole | None = None
    is_active: bool | None = None


class EmployeeSelfUpdate(BaseModel):
    phone: str | None = Field(default=None, max_length=40)
    address: str | None = None
    date_of_birth: date | None = None


class EmployeeOut(BaseModel):
    id: int
    user_id: int
    email: EmailStr
    role: UserRole
    is_active: bool

    first_name: str
    last_name: str
    job_title: str
    employment_type: EmploymentType
    employment_status: EmploymentStatus
    hire_date: date
    termination_date: date | None
    department: DepartmentSummary | None
    manager: EmployeeSummary | None

    date_of_birth: date | None
    phone: str | None
    address: str | None
    salary: Decimal | None

    created_at: datetime
    updated_at: datetime


class EmployeeListResponse(BaseModel):
    items: list[EmployeeOut]
    total: int
    page: int
    page_size: int


class EmployeeCreated(BaseModel):
    employee: EmployeeOut
    temporary_password: str
