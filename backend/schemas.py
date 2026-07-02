from __future__ import annotations

# Pydantic schemas used by the API, Each section below groups together the
# request and response models for one feature area (auth, houses, expenses etc

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


# ---- auth ----
class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    # Minimum eight characters aligns with modern password guidance and
    # forces attackers doing offline cracking of the bcrypt hashes to
    # search a much larger keyspace than the previous six-character floor
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr

    class Config:
        from_attributes = True


# Full profile response, Returned by GET /api/profile/me and after a PATCH
# or avatar upload
class ProfileOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    avatar_url: str = ""
    bio: str = ""
    pronouns: str = ""
    venmo_handle: str = ""
    zelle_handle: str = ""
    phone: str = ""
    dietary_restrictions: str = ""
    chore_preferences: str = ""
    timezone: str = "America/New_York"

    class Config:
        from_attributes = True


# Request body for partial profile updates. Every field is optional so the
# client can send only the values that changed
class ProfileUpdate(BaseModel):
    bio: Optional[str] = None
    pronouns: Optional[str] = None
    venmo_handle: Optional[str] = None
    zelle_handle: Optional[str] = None
    phone: Optional[str] = None
    dietary_restrictions: Optional[str] = None
    chore_preferences: Optional[str] = None
    timezone: Optional[str] = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---- house ----
class HouseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    address: str = Field(default="", max_length=200)


class HouseJoin(BaseModel):
    invite_code: str = Field(min_length=4, max_length=16)


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
    avatar_url: str = ""
    bio: str = ""
    pronouns: str = ""
    venmo_handle: str = ""
    zelle_handle: str = ""
    phone: str = ""
    dietary_restrictions: str = ""
    chore_preferences: str = ""
    timezone: str = "America/New_York"
    move_in_date: Optional[datetime] = None
    move_out_date: Optional[datetime] = None
    is_archived: bool = False

    class Config:
        from_attributes = True


# ---- chores ----
class ChoreCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=1000)
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
    # A value of zero means the member is not part of this split
    # Negative values are not allowed
    amount_owed: float = Field(ge=0, le=1_000_000)


class ExpenseCreate(BaseModel):
    title: str
    category: str = "general"
    # Expense amount must be positive, The upper bound prevents a typo
    # from creating an enormous balance
    amount: float = Field(gt=0, le=1_000_000)
    # If the splits list is empty, the server divides the amount equally
    # between all current house members
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
    # Settlement amounts must be positive. Zero or negative values would
    # otherwise produce phantom payments and corrupt balances
    amount: float = Field(gt=0, le=1_000_000)


# ---- grocery ----
class GroceryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    quantity: str = Field(default="1", max_length=32)
    category: str = Field(default="other", max_length=32)


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
    title: str = Field(max_length=200)
    message: str = Field(default="", max_length=5000)
    urgency: str = "normal"
    is_pinned: bool = False


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    message: Optional[str] = Field(default=None, max_length=5000)
    urgency: Optional[str] = None


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
    description: str = Field(default="", max_length=1000)


class QuietViolationOut(BaseModel):
    id: int
    reported_by_name: str
    offender_name: Optional[str]
    description: str
    occurred_at: datetime


# ---- maintenance ----
class MaintenanceCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)
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
    title: str = Field(max_length=200)
    description: str = Field(default="", max_length=5000)


class ConflictOut(BaseModel):
    id: int
    title: str
    description: str
    logged_by_name: str
    occurred_at: datetime
