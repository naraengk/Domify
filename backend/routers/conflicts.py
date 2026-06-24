from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import ConflictLog, User
from schemas import ConflictCreate, ConflictOut
from auth import get_current_user, require_house_member

router = APIRouter(prefix="/api/houses/{house_id}/conflicts", tags=["conflicts"])


@router.get("", response_model=list[ConflictOut])
def list_conflicts(house_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    rows = (
        db.query(ConflictLog).filter(ConflictLog.house_id == house_id)
        .order_by(ConflictLog.occurred_at.desc()).all()
    )
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
    require_house_member(house_id, user, db)
    c = ConflictLog(
        house_id=house_id, title=data.title, description=data.description,
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
    require_house_member(house_id, user, db)
    c = db.get(ConflictLog, cid)
    if not c or c.house_id != house_id:
        raise HTTPException(404, "Not found")
    db.delete(c)
    db.commit()
    return {"ok": True}
