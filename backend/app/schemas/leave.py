from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.leave import LeaveStatus
from app.schemas.employee import EmployeeSummary


class LeaveTypeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    default_days_per_year: Decimal = Field(default=Decimal("0"), ge=0)
    is_paid: bool = True
    is_active: bool = True


class LeaveTypeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    default_days_per_year: Decimal | None = Field(default=None, ge=0)
    is_paid: bool | None = None
    is_active: bool | None = None


class LeaveTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    default_days_per_year: Decimal
    is_paid: bool
    is_active: bool
    created_at: datetime


class LeaveBalanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    year: int
    allocated_days: Decimal
    used_days: Decimal
    remaining_days: Decimal
    leave_type: LeaveTypeOut


class LeaveBalanceAdjust(BaseModel):
    allocated_days: Decimal | None = Field(default=None, ge=0)
    used_days: Decimal | None = Field(default=None, ge=0)


class LeaveRequestCreate(BaseModel):
    leave_type_id: int
    start_date: date
    end_date: date
    reason: str = Field(default="", max_length=2000)


class LeaveDecisionIn(BaseModel):
    status: Literal["APPROVED", "REJECTED"]
    note: str | None = Field(default=None, max_length=2000)


class LeaveCancelIn(BaseModel):
    note: str | None = Field(default=None, max_length=2000)


class DecidedBySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr


class LeaveRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee: EmployeeSummary
    leave_type: LeaveTypeOut
    start_date: date
    end_date: date
    days_count: int
    reason: str
    status: LeaveStatus
    decided_at: datetime | None
    decision_note: str | None
    decided_by: DecidedBySummary | None
    created_at: datetime
