from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import QuietHours, QuietViolation, User
from schemas import QuietHoursUpdate, QuietHoursOut, QuietViolationCreate, QuietViolationOut
from auth import get_current_user, require_house_member, require_admin
from security import sanitize_text, require_member_of

router = APIRouter(prefix="/api/houses/{house_id}/quiet", tags=["quiet"])


@router.get("/hours", response_model=QuietHoursOut)
def get_hours(house_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    q = db.query(QuietHours).filter(QuietHours.house_id == house_id).first()
    if not q:
        # return defaults if none configured yet
        return QuietHoursOut(start_time="22:00", end_time="08:00", days="Mon,Tue,Wed,Thu,Sun")
    return QuietHoursOut(start_time=q.start_time, end_time=q.end_time, days=q.days)


@router.put("/hours", response_model=QuietHoursOut)
def update_hours(house_id: int, data: QuietHoursUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_admin(house_id, user, db)
    q = db.query(QuietHours).filter(QuietHours.house_id == house_id).first()
    if not q:
        q = QuietHours(house_id=house_id)
        db.add(q)
    q.start_time = data.start_time
    q.end_time = data.end_time
    q.days = data.days
    db.commit()
    return QuietHoursOut(start_time=q.start_time, end_time=q.end_time, days=q.days)


@router.get("/violations", response_model=list[QuietViolationOut])
def list_violations(house_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    rows = (
        db.query(QuietViolation)
        .filter(QuietViolation.house_id == house_id)
        .order_by(QuietViolation.occurred_at.desc()).limit(100).all()
    )
    name_map = {u.id: u.name for u in db.query(User).all()}
    return [
        QuietViolationOut(
            id=v.id, reported_by_name=name_map.get(v.reported_by, "?"),
            offender_name=name_map.get(v.offender) if v.offender else None,
            description=v.description, occurred_at=v.occurred_at,
        )
        for v in rows
    ]


@router.post("/violations", response_model=QuietViolationOut)
def add_violation(house_id: int, data: QuietViolationCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    if data.offender is not None:
        # Only names of current housemates may be recorded as the offender.
        # Prevents cross-house user enumeration and lets you learn no name
        # by trying random ids.
        require_member_of(db, house_id, data.offender)
    v = QuietViolation(
        house_id=house_id, reported_by=user.id, offender=data.offender,
        description=sanitize_text(data.description, 1000),
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    offender_name = None
    if v.offender:
        u = db.get(User, v.offender)
        offender_name = u.name if u else None
    return QuietViolationOut(
        id=v.id, reported_by_name=user.name, offender_name=offender_name,
        description=v.description, occurred_at=v.occurred_at,
    )
