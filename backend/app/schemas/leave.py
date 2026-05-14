from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


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
