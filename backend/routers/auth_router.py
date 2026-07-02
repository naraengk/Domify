from __future__ import annotations

import os

from email_validator import validate_email, EmailNotValidError
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import UserCreate, UserLogin, TokenOut, UserOut
from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, set_auth_cookie, clear_auth_cookie,
)
from security import constant_time_password_verify, contains_profanity, sanitize_text

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut)
def register(data: UserCreate, response: Response, db: Session = Depends(get_db)):
    from fastapi import HTTPException, status

    name = sanitize_text(data.name, 80)
    if not name:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Enter a name")
    if contains_profanity(name):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Pick a different name")

    # Verify the email's domain exists and accepts mail. This blocks made-up
    # domains at registration. It cannot confirm the mailbox itself exists since
    # that would require sending a verification email, Skipped under tests
    # because it performs a DNS lookup
    if os.environ.get("TESTING") != "1":
        try:
            validate_email(data.email, check_deliverability=True)
        except EmailNotValidError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Enter a real email address")

    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")

    user = User(name=name, email=data.email, password_hash=hash_password(data.password))
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
    # Run bcrypt regardless of whether the user exists. This makes the
    # unregistered-email path take the same time as a wrong-password path,
    # blocking timing-based email enumeration
    hashed = user.password_hash if user else None
    if not constant_time_password_verify(data.password, hashed):
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
