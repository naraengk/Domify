from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import User, HouseMember

COOKIE_NAME = "domify_token"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def set_auth_cookie(response: Response, token: str) -> None:
    # frontend and backend are on different onrender.com subdomains, which
    # browsers treat as cross-site (onrender.com is on the public suffix list).
    # cross-site cookies need samesite=none + secure=true. lax works in local
    # http dev. we pick based on cookie_secure so both environments behave.
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="none" if settings.cookie_secure else "lax",
        max_age=settings.access_token_expire_minutes * 60,
        domain=settings.cookie_domain or None,
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        domain=settings.cookie_domain or None,
    )


def _decode_token(token: str) -> int:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return int(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")


def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    # prefer httpOnly cookie, fall back to Authorization header (tests / API clients)
    raw = request.cookies.get(COOKIE_NAME) or token
    if not raw:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    user_id = _decode_token(raw)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


def require_house_member(house_id: int, user: User, db: Session) -> HouseMember:
    mem = (
        db.query(HouseMember)
        .filter(HouseMember.house_id == house_id, HouseMember.user_id == user.id)
        .first()
    )
    if not mem:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this house")
    return mem


def require_admin(house_id: int, user: User, db: Session) -> HouseMember:
    mem = require_house_member(house_id, user, db)
    if mem.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin only")
    return mem
