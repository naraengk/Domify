from __future__ import annotations

# Routes for house announcements
# Any member of the house can create or delete announcements. Only admins
# can pin them. Titles and messages are passed through sanitize_text before
# being saved to prevent HTML or script content from being stored

import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Announcement, AnnouncementRead, User
from schemas import AnnouncementCreate, AnnouncementOut
from auth import get_current_user, require_house_member, require_admin
from security import sanitize_text, normalize_urgency

router = APIRouter(prefix="/api/houses/{house_id}/announcements", tags=["announcements"])


@router.get("", response_model=list[AnnouncementOut])
def list_ann(house_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Return all announcements for this house, pinned items first then by date
    require_house_member(house_id, user, db)
    items = (
        db.query(Announcement)
        .filter(Announcement.house_id == house_id)
        .order_by(Announcement.is_pinned.desc(), Announcement.created_at.desc())
        .all()
    )
    # Build a lookup of user names so each announcement can display its author
    name_map = {u.id: u.name for u in db.query(User).all()}
    # IDs of announcements the current user has already opened. Used to mark
    # items as read in the response
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
    # Create a new announcement for this house
    require_house_member(house_id, user, db)
    # Sanitize inputs before saving. sanitize_text strips HTML and enforces a
    # maximum length. normalize_urgency restricts the value to low, normal, or high
    a = Announcement(
        house_id=house_id,
        title=sanitize_text(data.title, 200),
        message=sanitize_text(data.message, 5000),
        urgency=normalize_urgency(data.urgency),
        is_pinned=data.is_pinned,
        created_by=user.id,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    # The author has implicitly read their own announcement
    return AnnouncementOut(
        id=a.id, title=a.title, message=a.message, urgency=a.urgency,
        is_pinned=a.is_pinned, created_by=a.created_by,
        created_by_name=user.name, created_at=a.created_at, is_read=True,
    )


@router.post("/{ann_id}/read")
def mark_read(house_id: int, ann_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Mark this announcement as read by the current user
    require_house_member(house_id, user, db)
    ann = db.get(Announcement, ann_id)
    if not ann or ann.house_id != house_id:
        raise HTTPException(404, "Not found")
    # Only one read record per user per announcement
    existing = db.query(AnnouncementRead).filter(
        AnnouncementRead.announcement_id == ann_id, AnnouncementRead.user_id == user.id,
    ).first()
    if not existing:
        db.add(AnnouncementRead(announcement_id=ann_id, user_id=user.id))
        db.commit()
    return {"ok": True}


@router.post("/{ann_id}/pin")
def pin(house_id: int, ann_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Toggle the pinned state. Restricted to admins so regular members cannot
    # force their own posts to the top of the list
    require_admin(house_id, user, db)
    a = db.get(Announcement, ann_id)
    if not a or a.house_id != house_id:
        raise HTTPException(404, "Not found")
    a.is_pinned = not a.is_pinned
    db.commit()
    return {"ok": True, "is_pinned": a.is_pinned}


@router.delete("/{ann_id}")
def delete_ann(house_id: int, ann_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Delete an announcement. Available to any member of the house
    require_house_member(house_id, user, db)
    a = db.get(Announcement, ann_id)
    if not a or a.house_id != house_id:
        raise HTTPException(404, "Not found")
    db.delete(a)
    db.commit()
    return {"ok": True}
