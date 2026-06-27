from __future__ import annotations

# Routes for the conflict log
# Members of the house record disputes or incidents in their own words.
# The entries form a neutral record that can be referenced later, for example
# in a discussion with the landlord. Titles and descriptions are sanitized
# in the same way as announcements before being stored

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import ConflictLog, User
from schemas import ConflictCreate, ConflictOut
from auth import get_current_user, require_house_member
from security import sanitize_text

router = APIRouter(prefix="/api/houses/{house_id}/conflicts", tags=["conflicts"])


@router.get("", response_model=list[ConflictOut])
def list_conflicts(house_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Return all conflict entries for this house, newest first
    require_house_member(house_id, user, db)
    rows = (
        db.query(ConflictLog).filter(ConflictLog.house_id == house_id)
        .order_by(ConflictLog.occurred_at.desc()).all()
    )
    # Build a lookup of user names so each entry can display its author
    name_map = {u.id: u.name for u in db.query(User).all()}
    return [
        ConflictOut(
            id=c.id, title=c.title, description=c.description,
            logged_by_name=name_map.get(c.logged_by, "?"), occurred_at=c.occurred_at,
        )
        for c in rows
    ]


@router.post("", response_model=ConflictOut)
def add_conflict(house_id: int, data: ConflictCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Create a new conflict log entry
    require_house_member(house_id, user, db)
    # Sanitize the title and description, and enforce maximum lengths
    c = ConflictLog(
        house_id=house_id,
        title=sanitize_text(data.title, 200),
        description=sanitize_text(data.description, 5000),
        logged_by=user.id,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return ConflictOut(
        id=c.id, title=c.title, description=c.description,
        logged_by_name=user.name, occurred_at=c.occurred_at,
    )


@router.delete("/{cid}")
def delete_conflict(house_id: int, cid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Delete a conflict log entry. Available to any member of the house
    require_house_member(house_id, user, db)
    c = db.get(ConflictLog, cid)
    if not c or c.house_id != house_id:
        raise HTTPException(404, "Not found")
    db.delete(c)
    db.commit()
    return {"ok": True}
