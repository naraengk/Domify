from __future__ import annotations

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship

from database import Base


# every user is one account. They can belong to one house at a time for simplicity.
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    memberships = relationship("HouseMember", back_populates="user", cascade="all, delete-orphan")


class House(Base):
    __tablename__ = "houses"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    address = Column(String, default="")
    invite_code = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("HouseMember", back_populates="house", cascade="all, delete-orphan")


# join table also stores role
class HouseMember(Base):
    __tablename__ = "house_members"
    id = Column(Integer, primary_key=True)
    house_id = Column(Integer, ForeignKey("houses.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, default="member")  # admin or member
    joined_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="memberships")
    house = relationship("House", back_populates="members")


class Chore(Base):
    __tablename__ = "chores"
    id = Column(Integer, primary_key=True)
    house_id = Column(Integer, ForeignKey("houses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    frequency = Column(String, default="weekly")  # daily / weekly / monthly
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    due_date = Column(DateTime, nullable=True)
    auto_rotate = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)


class ChoreCompletion(Base):
    __tablename__ = "chore_completions"
    id = Column(Integer, primary_key=True)
    chore_id = Column(Integer, ForeignKey("chores.id", ondelete="CASCADE"), nullable=False)
    completed_by = Column(Integer, ForeignKey("users.id"))
    completed_at = Column(DateTime, default=datetime.utcnow)


class Expense(Base):
    __tablename__ = "expenses"
    id = Column(Integer, primary_key=True)
    house_id = Column(Integer, ForeignKey("houses.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    category = Column(String, default="general")
    amount = Column(Float, nullable=False)
    paid_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    splits = relationship("ExpenseSplit", back_populates="expense", cascade="all, delete-orphan")


class ExpenseSplit(Base):
    __tablename__ = "expense_splits"
    id = Column(Integer, primary_key=True)
    expense_id = Column(Integer, ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount_owed = Column(Float, nullable=False)
    is_settled = Column(Boolean, default=False)

    expense = relationship("Expense", back_populates="splits")


class Settlement(Base):
    __tablename__ = "settlements"
    id = Column(Integer, primary_key=True)
    house_id = Column(Integer, ForeignKey("houses.id", ondelete="CASCADE"), nullable=False)
    from_user = Column(Integer, ForeignKey("users.id"), nullable=False)
    to_user = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    settled_at = Column(DateTime, default=datetime.utcnow)


class GroceryItem(Base):
    __tablename__ = "grocery_items"
    id = Column(Integer, primary_key=True)
    house_id = Column(Integer, ForeignKey("houses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    quantity = Column(String, default="1")
    category = Column(String, default="other")
    is_bought = Column(Boolean, default=False)
    added_by = Column(Integer, ForeignKey("users.id"))
    bought_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Announcement(Base):
    __tablename__ = "announcements"
    id = Column(Integer, primary_key=True)
    house_id = Column(Integer, ForeignKey("houses.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, default="")
    urgency = Column(String, default="normal")  # low / normal / high
    is_pinned = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)


class AnnouncementRead(Base):
    __tablename__ = "announcement_reads"
    id = Column(Integer, primary_key=True)
    announcement_id = Column(Integer, ForeignKey("announcements.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    read_at = Column(DateTime, default=datetime.utcnow)


# one row per house, holds the agreed quiet hours
class QuietHours(Base):
    __tablename__ = "quiet_hours"
    id = Column(Integer, primary_key=True)
    house_id = Column(Integer, ForeignKey("houses.id", ondelete="CASCADE"), unique=True, nullable=False)
    start_time = Column(String, default="22:00")
    end_time = Column(String, default="08:00")
    days = Column(String, default="Mon,Tue,Wed,Thu,Sun")  # comma sep
    updated_at = Column(DateTime, default=datetime.utcnow)


class QuietViolation(Base):
    __tablename__ = "quiet_violations"
    id = Column(Integer, primary_key=True)
    house_id = Column(Integer, ForeignKey("houses.id", ondelete="CASCADE"), nullable=False)
    reported_by = Column(Integer, ForeignKey("users.id"))
    offender = Column(Integer, ForeignKey("users.id"), nullable=True)
    description = Column(Text, default="")
    occurred_at = Column(DateTime, default=datetime.utcnow)


class MaintenanceRequest(Base):
    __tablename__ = "maintenance_requests"
    id = Column(Integer, primary_key=True)
    house_id = Column(Integer, ForeignKey("houses.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    urgency = Column(String, default="normal")
    status = Column(String, default="reported")  # reported / in_progress / resolved
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)


# neutral record of issues, useful when the landlord asks
class ConflictLog(Base):
    __tablename__ = "conflict_logs"
    id = Column(Integer, primary_key=True)
    house_id = Column(Integer, ForeignKey("houses.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    logged_by = Column(Integer, ForeignKey("users.id"))
    occurred_at = Column(DateTime, default=datetime.utcnow)
