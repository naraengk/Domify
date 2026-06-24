from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import GroceryItem, User
from schemas import GroceryCreate, GroceryOut
from auth import get_current_user, require_house_member

router = APIRouter(prefix="/api/houses/{house_id}/grocery", tags=["grocery"])


@router.get("", response_model=list[GroceryOut])
def list_items(house_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    items = db.query(GroceryItem).filter(GroceryItem.house_id == house_id).order_by(GroceryItem.is_bought, GroceryItem.created_at.desc()).all()
    name_map = {u.id: u.name for u in db.query(User).all()}
    out = []
    for it in items:
        item = GroceryOut.model_validate(it)
        item.added_by_name = name_map.get(it.added_by, "?")
        out.append(item)
    return out


@router.post("", response_model=GroceryOut)
def add_item(house_id: int, data: GroceryCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    it = GroceryItem(
        house_id=house_id, name=data.name, quantity=data.quantity,
        category=data.category, added_by=user.id,
    )
    db.add(it)
    db.commit()
    db.refresh(it)
    out = GroceryOut.model_validate(it)
    out.added_by_name = user.name
    return out


@router.post("/{item_id}/toggle", response_model=GroceryOut)
def toggle(house_id: int, item_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    it = db.get(GroceryItem, item_id)
    if not it or it.house_id != house_id:
        raise HTTPException(404, "Not found")
    it.is_bought = not it.is_bought
    it.bought_by = user.id if it.is_bought else None
    db.commit()
    db.refresh(it)
    out = GroceryOut.model_validate(it)
    out.added_by_name = (db.get(User, it.added_by) or user).name
    return out


@router.delete("/{item_id}")
def remove(house_id: int, item_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    it = db.get(GroceryItem, item_id)
    if not it or it.house_id != house_id:
        raise HTTPException(404, "Not found")
    db.delete(it)
    db.commit()
    return {"ok": True}


@router.delete("/bought/clear")
def clear_bought(house_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_house_member(house_id, user, db)
    db.query(GroceryItem).filter(
        GroceryItem.house_id == house_id, GroceryItem.is_bought == True
    ).delete()
    db.commit()
    return {"ok": True}
