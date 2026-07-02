from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import (
    User, Expense, Announcement, Chore, ChoreCompletion,
    GroceryItem, Settlement, MaintenanceRequest, ConflictLog,
    QuietViolation,
)
from auth import get_current_user, require_house_member

router = APIRouter(prefix="/api/houses/{house_id}/notifications", tags=["notifications"])


# Merges the most recent activity from every house-scoped table into a
# single feed. Each table contributes its ten newest rows, The final feed
# is sorted by timestamp descending and capped at twenty entries
@router.get("")
def list_notifications(
    house_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_house_member(house_id, user, db)

    name_map = {u.id: u.name for u in db.query(User).all()}
    def actor(uid): return name_map.get(uid, "Someone")

    items = []

    for e in (
        db.query(Expense)
        .filter(Expense.house_id == house_id)
        .order_by(Expense.created_at.desc()).limit(10).all()
    ):
        items.append({
            "id": f"expense-{e.id}", "kind": "expense",
            "actor_name": actor(e.paid_by),
            "message": f"added expense '{e.title}' for ${e.amount:.2f}",
            "created_at": e.created_at, "view": "expenses",
        })

    for s in (
        db.query(Settlement)
        .filter(Settlement.house_id == house_id)
        .order_by(Settlement.settled_at.desc()).limit(10).all()
    ):
        items.append({
            "id": f"settle-{s.id}", "kind": "settlement",
            "actor_name": actor(s.from_user),
            "message": f"paid {actor(s.to_user)} ${s.amount:.2f}",
            "created_at": s.settled_at, "view": "expenses",
        })

    for a in (
        db.query(Announcement)
        .filter(Announcement.house_id == house_id)
        .order_by(Announcement.created_at.desc()).limit(10).all()
    ):
        items.append({
            "id": f"announce-{a.id}", "kind": "announcement",
            "actor_name": actor(a.created_by),
            "message": f"posted '{a.title}'",
            "created_at": a.created_at, "view": "announcements",
        })

    for c in (
        db.query(Chore)
        .filter(Chore.house_id == house_id)
        .order_by(Chore.created_at.desc()).limit(10).all()
    ):
        items.append({
            "id": f"chore-{c.id}", "kind": "chore",
            "actor_name": actor(c.created_by),
            "message": f"added chore '{c.name}'",
            "created_at": c.created_at, "view": "chores",
        })

    for cc, chore in (
        db.query(ChoreCompletion, Chore)
        .join(Chore, Chore.id == ChoreCompletion.chore_id)
        .filter(Chore.house_id == house_id)
        .order_by(ChoreCompletion.completed_at.desc()).limit(10).all()
    ):
        items.append({
            "id": f"choredone-{cc.id}", "kind": "chore_done",
            "actor_name": actor(cc.completed_by),
            "message": f"completed '{chore.name}'",
            "created_at": cc.completed_at, "view": "chores",
        })

    for g in (
        db.query(GroceryItem)
        .filter(GroceryItem.house_id == house_id)
        .order_by(GroceryItem.created_at.desc()).limit(10).all()
    ):
        items.append({
            "id": f"grocery-{g.id}", "kind": "grocery",
            "actor_name": actor(g.added_by),
            "message": f"added '{g.name}' to grocery",
            "created_at": g.created_at, "view": "grocery",
        })

    for m in (
        db.query(MaintenanceRequest)
        .filter(MaintenanceRequest.house_id == house_id)
        .order_by(MaintenanceRequest.created_at.desc()).limit(10).all()
    ):
        items.append({
            "id": f"maint-{m.id}", "kind": "maintenance",
            "actor_name": actor(m.created_by),
            "message": f"reported '{m.title}'",
            "created_at": m.created_at, "view": "maintenance",
        })

    for cl in (
        db.query(ConflictLog)
        .filter(ConflictLog.house_id == house_id)
        .order_by(ConflictLog.occurred_at.desc()).limit(10).all()
    ):
        items.append({
            "id": f"conflict-{cl.id}", "kind": "conflict",
            "actor_name": actor(cl.logged_by),
            "message": f"logged conflict '{cl.title}'",
            "created_at": cl.occurred_at, "view": "conflicts",
        })

    for qv in (
        db.query(QuietViolation)
        .filter(QuietViolation.house_id == house_id)
        .order_by(QuietViolation.occurred_at.desc()).limit(10).all()
    ):
        items.append({
            "id": f"quiet-{qv.id}", "kind": "quiet",
            "actor_name": actor(qv.reported_by),
            "message": "reported a quiet-hours violation",
            "created_at": qv.occurred_at, "view": "quiet",
        })

    items.sort(key=lambda x: x["created_at"], reverse=True)
    return items[:20]
