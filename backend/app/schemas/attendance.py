from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.attendance import AttendanceStatus
from app.schemas.employee import EmployeeSummary


class AttendanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee: EmployeeSummary
    date: date
    check_in_at: datetime | None
    check_out_at: datetime | None
    hours_worked: Decimal | None
    status: AttendanceStatus
    note: str | None
    created_at: datetime
    updated_at: datetime


class AttendanceCreate(BaseModel):
    """Admin manual entry / correction."""
    employee_id: int
    date: date
    check_in_at: datetime | None = None
    check_out_at: datetime | None = None
    status: AttendanceStatus | None = None
    note: str | None = Field(default=None, max_length=2000)


class AttendanceUpdate(BaseModel):
    check_in_at: datetime | None = None
    check_out_at: datetime | None = None
    status: AttendanceStatus | None = None
    note: str | None = Field(default=None, max_length=2000)
