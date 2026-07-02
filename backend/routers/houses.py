from __future__ import annotations

# Routes for creating, joining, listing, and leaving houses, plus listing
# the members of a house. Each house has a randomly generated invite code
# that other users paste in to join

import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import House, HouseMember, User
from schemas import HouseCreate, HouseJoin, HouseOut, MemberOut
from auth import get_current_user, require_house_member, require_admin
from security import sanitize_text, contains_profanity

router = APIRouter(prefix="/api/houses", tags=["houses"])


def _make_code() -> str:
    # Generate an 8-character uppercase invite code, The base62-style output
    # from secrets.token_urlsafe may contain _ and -, which are replaced
    # so the final code uses only letters and digits
    return secrets.token_urlsafe(6).replace("_", "A").replace("-", "B")[:8].upper()


def _member_out(u: User, role: str, joined: datetime, mem: HouseMember) -> MemberOut:
    # Build a MemberOut response for the /members endpoint, Includes the
    # profile fields stored on the user and the optional move-in/move-out
    # dates stored on the membership row, NULL values are converted to
    # empty strings so the Pydantic model validates cleanly
    now = datetime.utcnow()
    archived = mem.move_out_date is not None and mem.move_out_date <= now
    return MemberOut(
        id=u.id, name=u.name, email=u.email, role=role, joined_at=joined,
        avatar_url=u.avatar_url or "",
        bio=u.bio or "",
        pronouns=u.pronouns or "",
        venmo_handle=u.venmo_handle or "",
        zelle_handle=u.zelle_handle or "",
        phone=u.phone or "",
        dietary_restrictions=u.dietary_restrictions or "",
        chore_preferences=u.chore_preferences or "",
        timezone=u.timezone or "America/New_York",
        move_in_date=mem.move_in_date,
        move_out_date=mem.move_out_date,
        is_archived=archived,
    )


@router.post("", response_model=HouseOut)
def create_house(data: HouseCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Create a new house, The user who creates the house is added as its admin
    name = sanitize_text(data.name, 80)
    if contains_profanity(name):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Pick a different house name")
    house = House(
        name=name,
        address=sanitize_text(data.address, 200),
        invite_code=_make_code(),
    )
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
    # Join an existing house using its invite code
    house = db.query(House).filter(House.invite_code == data.invite_code.upper()).first()
    if not house:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invalid invite code")
    # If the user is already a member, return their existing membership
    # rather than creating a duplicate row
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
    # Return every house this user is a member of, along with their role
    # in each one
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
    # Return the full member list for a house, including each member's
    # profile fields and their move-in/move-out dates
    require_house_member(house_id, user, db)
    return [
        _member_out(u, role, joined, mem)
        for u, role, joined, mem in (
            db.query(User, HouseMember.role, HouseMember.joined_at, HouseMember)
            .join(HouseMember, HouseMember.user_id == User.id)
            .filter(HouseMember.house_id == house_id)
            .all()
        )
    ]


@router.delete("/{house_id}/leave")
def leave(house_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Remove the current user's membership from this house
    mem = require_house_member(house_id, user, db)
    db.delete(mem)
    db.commit()
    return {"ok": True}


@router.delete("/{house_id}/members/{user_id}")
def remove_member(house_id: int, user_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Admin-only
    # Remove another member from the house, Admins cannot remove
    # themselves through this endpoint; they must call /leave instead
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
