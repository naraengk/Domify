from __future__ import annotations

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Chore, ChoreCompletion, HouseMember, User
from schemas import ChoreCreate, ChoreOut, ChoreCompletionOut
from auth import get_current_user, require_house_member
from security import sanitize_text, require_member_of

router = APIRouter(prefix="/api/houses/{house_id}/chores", tags=["chores"])


def _next_due(frequency: str, base: datetime) -> datetime:
    # advance the due date based on frequency
    if frequency == "daily":
        return base + timedelta(days=1)
    if frequency == "monthly":
        return base + timedelta(days=30)
    return base + timedelta(days=7)  # weekly default


def _rotate_assignee(db: Session, chore: Chore) -> int | None:
    # find the next roommate in the rotation. simple round robin by member id.
    members = (
        db.query(HouseMember)
        .filter(HouseMember.house_id == chore.house_id)
        .order_by(HouseMember.id)
        .all()
    )
    if not members:
        return None
    ids = [m.user_id for m in members]
    if chore.assigned_to in ids:
        idx = (ids.index(chore.assigned_to) + 1) % len(ids)
    else:
        idx = 0
    return ids[idx]


@router.get("", response_model=list[ChoreOut])
def list_chores(house_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    chores = db.query(Chore).filter(Chore.house_id == house_id).order_by(Chore.due_date).all()
    # gather assignee names in one query
    user_map = {u.id: u.name for u in db.query(User).all()}
    now = datetime.utcnow()
    out = []
    for c in chores:
        item = ChoreOut.model_validate(c)
        item.assigned_to_name = user_map.get(c.assigned_to) if c.assigned_to else None
        item.is_overdue = bool(c.due_date and c.due_date < now)
        out.append(item)
    return out


_ALLOWED_FREQUENCY = {"daily", "weekly", "monthly"}


@router.post("", response_model=ChoreOut)
def create_chore(house_id: int, data: ChoreCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    # if no assignee, pick the first member for now
    assignee = data.assigned_to
    if assignee is not None:
        # Prevent naming a user in another house as the assignee.
        require_member_of(db, house_id, assignee)
    else:
        first = db.query(HouseMember).filter(HouseMember.house_id == house_id).order_by(HouseMember.id).first()
        assignee = first.user_id if first else None

    frequency = data.frequency if data.frequency in _ALLOWED_FREQUENCY else "weekly"
    due = data.due_date or _next_due(frequency, datetime.utcnow())

    chore = Chore(
        house_id=house_id,
        name=sanitize_text(data.name, 120),
        description=sanitize_text(data.description, 1000),
        frequency=frequency,
        assigned_to=assignee,
        due_date=due,
        auto_rotate=data.auto_rotate,
        created_by=user.id,
    )
    db.add(chore)
    db.commit()
    db.refresh(chore)
    out = ChoreOut.model_validate(chore)
    if assignee:
        u = db.get(User, assignee)
        out.assigned_to_name = u.name if u else None
    return out


@router.post("/{chore_id}/complete", response_model=ChoreOut)
def complete_chore(house_id: int, chore_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    chore = db.get(Chore, chore_id)
    if not chore or chore.house_id != house_id:
        raise HTTPException(404, "Chore not found")

    db.add(ChoreCompletion(chore_id=chore.id, completed_by=user.id))
    # roll the due date forward and rotate if needed
    chore.due_date = _next_due(chore.frequency, datetime.utcnow())
    if chore.auto_rotate:
        chore.assigned_to = _rotate_assignee(db, chore)
    db.commit()
    db.refresh(chore)
    out = ChoreOut.model_validate(chore)
    if chore.assigned_to:
        u = db.get(User, chore.assigned_to)
        out.assigned_to_name = u.name if u else None
    return out


@router.delete("/{chore_id}")
def delete_chore(house_id: int, chore_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    chore = db.get(Chore, chore_id)
    if not chore or chore.house_id != house_id:
        raise HTTPException(404, "Not found")
    db.delete(chore)
    db.commit()
    return {"ok": True}


@router.get("/history", response_model=list[ChoreCompletionOut])
def history(house_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    rows = (
        db.query(ChoreCompletion, Chore, User)
        .join(Chore, Chore.id == ChoreCompletion.chore_id)
        .join(User, User.id == ChoreCompletion.completed_by)
        .filter(Chore.house_id == house_id)
        .order_by(ChoreCompletion.completed_at.desc())
        .limit(50)
        .all()
    )
    return [
        ChoreCompletionOut(
            id=cc.id, chore_id=cc.chore_id, chore_name=ch.name,
            completed_by=cc.completed_by, completed_by_name=u.name,
            completed_at=cc.completed_at,
        )
        for cc, ch, u in rows
    ]


@router.get("/summary")
def summary(house_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    week_ago = datetime.utcnow() - timedelta(days=7)
    # count completions per member in the last 7 days
    members = db.query(User).join(HouseMember).filter(HouseMember.house_id == house_id).all()
    result = []
    for m in members:
        cnt = (
            db.query(ChoreCompletion)
            .join(Chore, Chore.id == ChoreCompletion.chore_id)
            .filter(Chore.house_id == house_id, ChoreCompletion.completed_by == m.id,
                    ChoreCompletion.completed_at >= week_ago)
            .count()
        )
        result.append({"user_id": m.id, "user_name": m.name, "completed_this_week": cnt})
    result.sort(key=lambda r: -r["completed_this_week"])
    return result
