from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import UserCreate, UserLogin, TokenOut, UserOut
from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, set_auth_cookie, clear_auth_cookie,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut)
def register(data: UserCreate, response: Response, db: Session = Depends(get_db)):
    from fastapi import HTTPException, status
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")

    user = User(name=data.name, email=data.email, password_hash=hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    set_auth_cookie(response, token)
    return TokenOut(access_token="", user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
def login(data: UserLogin, response: Response, db: Session = Depends(get_db)):
    from fastapi import HTTPException, status
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Bad email or password")

    token = create_access_token(user.id)
    set_auth_cookie(response, token)
    return TokenOut(access_token="", user=UserOut.model_validate(user))


@router.post("/logout")
def logout(response: Response):
    clear_auth_cookie(response)
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
