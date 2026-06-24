from __future__ import annotations

import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import House, HouseMember, User
from schemas import HouseCreate, HouseJoin, HouseOut, MemberOut
from auth import get_current_user, require_house_member, require_admin

router = APIRouter(prefix="/api/houses", tags=["houses"])


def _make_code() -> str:
    # short invite code, uppercase letters + digits
    return secrets.token_urlsafe(6).replace("_", "A").replace("-", "B")[:8].upper()


@router.post("", response_model=HouseOut)
def create_house(data: HouseCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # creator becomes admin
    house = House(name=data.name, address=data.address, invite_code=_make_code())
    db.add(house)
    db.flush()
    mem = HouseMember(house_id=house.id, user_id=user.id, role="admin")
    db.add(mem)
    db.commit()
    db.refresh(house)
    out = HouseOut.model_validate(house)
    out.role = "admin"
    return out


@router.post("/join", response_model=HouseOut)
def join_house(data: HouseJoin, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    house = db.query(House).filter(House.invite_code == data.invite_code.upper()).first()
    if not house:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invalid invite code")
    # don't double-join
    existing = db.query(HouseMember).filter(
        HouseMember.house_id == house.id, HouseMember.user_id == user.id
    ).first()
    if existing:
        out = HouseOut.model_validate(house)
        out.role = existing.role
        return out

    mem = HouseMember(house_id=house.id, user_id=user.id, role="member")
    db.add(mem)
    db.commit()
    out = HouseOut.model_validate(house)
    out.role = "member"
    return out


@router.get("/mine", response_model=list[HouseOut])
def list_my_houses(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(House, HouseMember.role)
        .join(HouseMember, HouseMember.house_id == House.id)
        .filter(HouseMember.user_id == user.id)
        .all()
    )
    result = []
    for house, role in rows:
        item = HouseOut.model_validate(house)
        item.role = role
        result.append(item)
    return result


@router.get("/{house_id}/members", response_model=list[MemberOut])
def members(house_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    rows = (
        db.query(User, HouseMember.role, HouseMember.joined_at)
        .join(HouseMember, HouseMember.user_id == User.id)
        .filter(HouseMember.house_id == house_id)
        .all()
    )
    return [
        MemberOut(id=u.id, name=u.name, email=u.email, role=role, joined_at=joined)
        for u, role, joined in rows
    ]


@router.delete("/{house_id}/leave")
def leave(house_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    mem = require_house_member(house_id, user, db)
    db.delete(mem)
    db.commit()
    return {"ok": True}


@router.delete("/{house_id}/members/{user_id}")
def remove_member(house_id: int, user_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_admin(house_id, user, db)
    if user_id == user.id:
        raise HTTPException(400, "Use /leave to remove yourself")
    mem = db.query(HouseMember).filter(
        HouseMember.house_id == house_id, HouseMember.user_id == user_id
    ).first()
    if not mem:
        raise HTTPException(404, "Not a member")
    db.delete(mem)
    db.commit()
    return {"ok": True}
