from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import MaintenanceRequest, User
from schemas import MaintenanceCreate, MaintenanceUpdate, MaintenanceOut
from auth import get_current_user, require_house_member

router = APIRouter(prefix="/api/houses/{house_id}/maintenance", tags=["maintenance"])


def _to_out(m: MaintenanceRequest, name_map: dict[int, str]) -> MaintenanceOut:
    return MaintenanceOut(
        id=m.id, title=m.title, description=m.description, urgency=m.urgency,
        status=m.status, assigned_to=m.assigned_to,
        assigned_to_name=name_map.get(m.assigned_to) if m.assigned_to else None,
        created_by=m.created_by, created_by_name=name_map.get(m.created_by, "?"),
        created_at=m.created_at,
    )


@router.get("", response_model=list[MaintenanceOut])
def list_requests(house_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    rows = (
        db.query(MaintenanceRequest)
        .filter(MaintenanceRequest.house_id == house_id)
        .order_by(MaintenanceRequest.created_at.desc()).all()
    )
    name_map = {u.id: u.name for u in db.query(User).all()}
    return [_to_out(m, name_map) for m in rows]


@router.post("", response_model=MaintenanceOut)
def create_request(house_id: int, data: MaintenanceCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    m = MaintenanceRequest(
        house_id=house_id, title=data.title, description=data.description,
        urgency=data.urgency, assigned_to=data.assigned_to, created_by=user.id,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    name_map = {u.id: u.name for u in db.query(User).all()}
    return _to_out(m, name_map)


@router.patch("/{req_id}", response_model=MaintenanceOut)
def update_request(house_id: int, req_id: int, data: MaintenanceUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    m = db.get(MaintenanceRequest, req_id)
    if not m or m.house_id != house_id:
        raise HTTPException(404, "Not found")
    if data.status is not None:
        m.status = data.status
    if data.assigned_to is not None:
        m.assigned_to = data.assigned_to
    db.commit()
    db.refresh(m)
    name_map = {u.id: u.name for u in db.query(User).all()}
    return _to_out(m, name_map)


@router.delete("/{req_id}")
def delete_request(house_id: int, req_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    m = db.get(MaintenanceRequest, req_id)
    if not m or m.house_id != house_id:
        raise HTTPException(404, "Not found")
    db.delete(m)
    db.commit()
    return {"ok": True}
