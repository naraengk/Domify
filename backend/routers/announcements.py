from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Announcement, AnnouncementRead, User
from schemas import AnnouncementCreate, AnnouncementOut
from auth import get_current_user, require_house_member, require_admin

router = APIRouter(prefix="/api/houses/{house_id}/announcements", tags=["announcements"])


@router.get("", response_model=list[AnnouncementOut])
def list_ann(house_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    items = (
        db.query(Announcement)
        .filter(Announcement.house_id == house_id)
        # pinned first, then newest
        .order_by(Announcement.is_pinned.desc(), Announcement.created_at.desc())
        .all()
    )
    name_map = {u.id: u.name for u in db.query(User).all()}
    read_ids = {
        r.announcement_id for r in
        db.query(AnnouncementRead).filter(AnnouncementRead.user_id == user.id).all()
    }
    return [
        AnnouncementOut(
            id=a.id, title=a.title, message=a.message, urgency=a.urgency,
            is_pinned=a.is_pinned, created_by=a.created_by,
            created_by_name=name_map.get(a.created_by, "?"),
            created_at=a.created_at, is_read=a.id in read_ids,
        )
        for a in items
    ]


@router.post("", response_model=AnnouncementOut)
def create_ann(house_id: int, data: AnnouncementCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    a = Announcement(
        house_id=house_id, title=data.title, message=data.message,
        urgency=data.urgency, is_pinned=data.is_pinned, created_by=user.id,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return AnnouncementOut(
        id=a.id, title=a.title, message=a.message, urgency=a.urgency,
        is_pinned=a.is_pinned, created_by=a.created_by,
        created_by_name=user.name, created_at=a.created_at, is_read=True,
    )


@router.post("/{ann_id}/read")
def mark_read(house_id: int, ann_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    # don't insert duplicates
    existing = db.query(AnnouncementRead).filter(
        AnnouncementRead.announcement_id == ann_id, AnnouncementRead.user_id == user.id,
    ).first()
    if not existing:
        db.add(AnnouncementRead(announcement_id=ann_id, user_id=user.id))
        db.commit()
    return {"ok": True}


@router.post("/{ann_id}/pin")
def pin(house_id: int, ann_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_admin(house_id, user, db)
    a = db.get(Announcement, ann_id)
    if not a or a.house_id != house_id:
        raise HTTPException(404, "Not found")
    a.is_pinned = not a.is_pinned
    db.commit()
    return {"ok": True, "is_pinned": a.is_pinned}


@router.delete("/{ann_id}")
def delete_ann(house_id: int, ann_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    a = db.get(Announcement, ann_id)
    if not a or a.house_id != house_id:
        raise HTTPException(404, "Not found")
    db.delete(a)
    db.commit()
    return {"ok": True}
