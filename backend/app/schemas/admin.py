from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.user import UserRole


class StatsByDepartment(BaseModel):
    department_id: int | None
    department_name: str
    count: int


class HeadcountStats(BaseModel):
    total_active: int
    by_status: dict[str, int]
    by_department: list[StatsByDepartment]


class TodayAttendanceStats(BaseModel):
    present: int
    late: int
    half_day: int
    on_leave: int
    not_checked_in: int


class AdminStats(BaseModel):
    headcount: HeadcountStats
    pending_leave_count: int
    today_attendance: TodayAttendanceStats


class AdminUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    role: UserRole
    is_active: bool
    must_change_password: bool
    created_at: datetime
    employee_name: str | None
