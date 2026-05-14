from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.user import UserRole
from app.schemas.department import DepartmentSummary


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    role: UserRole
    is_active: bool
    must_change_password: bool
    created_at: datetime


class MeEmployee(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    job_title: str
    department: DepartmentSummary | None


class MeOut(UserOut):
    employee: MeEmployee | None = None
