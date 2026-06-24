from __future__ import annotations

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


# ---- auth ----
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---- house ----
class HouseCreate(BaseModel):
    name: str
    address: str = ""


class HouseJoin(BaseModel):
    invite_code: str


class HouseOut(BaseModel):
    id: int
    name: str
    address: str
    invite_code: str
    role: Optional[str] = None

    class Config:
        from_attributes = True


class MemberOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True


# ---- chores ----
class ChoreCreate(BaseModel):
    name: str
    description: str = ""
    frequency: str = "weekly"
    assigned_to: Optional[int] = None
    due_date: Optional[datetime] = None
    auto_rotate: bool = True


class ChoreOut(BaseModel):
    id: int
    name: str
    description: str
    frequency: str
    assigned_to: Optional[int]
    assigned_to_name: Optional[str] = None
    due_date: Optional[datetime]
    auto_rotate: bool
    is_overdue: bool = False

    class Config:
        from_attributes = True


class ChoreCompletionOut(BaseModel):
    id: int
    chore_id: int
    chore_name: str
    completed_by: int
    completed_by_name: str
    completed_at: datetime


# ---- expenses ----
class ExpenseSplitIn(BaseModel):
    user_id: int
    amount_owed: float


class ExpenseCreate(BaseModel):
    title: str
    category: str = "general"
    amount: float
    # if splits is empty we split equally between all current members
    splits: List[ExpenseSplitIn] = []


class ExpenseSplitOut(BaseModel):
    user_id: int
    user_name: str
    amount_owed: float
    is_settled: bool


class ExpenseOut(BaseModel):
    id: int
    title: str
    category: str
    amount: float
    paid_by: int
    paid_by_name: str
    created_at: datetime
    splits: List[ExpenseSplitOut]


class BalanceOut(BaseModel):
    user_id: int
    user_name: str
    net: float  # positive means others owe them, negative means they owe


class SettleIn(BaseModel):
    to_user: int
    amount: float


# ---- grocery ----
class GroceryCreate(BaseModel):
    name: str
    quantity: str = "1"
    category: str = "other"


class GroceryOut(BaseModel):
    id: int
    name: str
    quantity: str
    category: str
    is_bought: bool
    added_by: int
    added_by_name: str = ""

    class Config:
        from_attributes = True


# ---- announcements ----
class AnnouncementCreate(BaseModel):
    title: str
    message: str = ""
    urgency: str = "normal"
    is_pinned: bool = False


class AnnouncementOut(BaseModel):
    id: int
    title: str
    message: str
    urgency: str
    is_pinned: bool
    created_by: int
    created_by_name: str
    created_at: datetime
    is_read: bool = False


# ---- quiet hours ----
class QuietHoursUpdate(BaseModel):
    start_time: str
    end_time: str
    days: str


class QuietHoursOut(BaseModel):
    start_time: str
    end_time: str
    days: str


class QuietViolationCreate(BaseModel):
    offender: Optional[int] = None
    description: str = ""


class QuietViolationOut(BaseModel):
    id: int
    reported_by_name: str
    offender_name: Optional[str]
    description: str
    occurred_at: datetime


# ---- maintenance ----
class MaintenanceCreate(BaseModel):
    title: str
    description: str = ""
    urgency: str = "normal"
    assigned_to: Optional[int] = None


class MaintenanceUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[int] = None


class MaintenanceOut(BaseModel):
    id: int
    title: str
    description: str
    urgency: str
    status: str
    assigned_to: Optional[int]
    assigned_to_name: Optional[str]
    created_by: int
    created_by_name: str
    created_at: datetime


# ---- conflict log ----
class ConflictCreate(BaseModel):
    title: str
    description: str = ""


class ConflictOut(BaseModel):
    id: int
    title: str
    description: str
    logged_by_name: str
    occurred_at: datetime
