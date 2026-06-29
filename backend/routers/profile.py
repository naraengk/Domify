from __future__ import annotations

# Routes for managing the current user's profile
# Supports reading the profile, updating any subset of fields, and uploading
# an avatar image. All text fields are passed through sanitize_text before
# being stored

import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import User
from schemas import ProfileOut, ProfileUpdate
from security import sanitize_text

router = APIRouter(prefix="/api/profile", tags=["profile"])


def _profile_out(u: User) -> ProfileOut:
    # Build a ProfileOut response from a User row. Any column that is NULL
    # in the database is converted to an empty string so the Pydantic model
    # validates correctly. This is important for rows that pre-date the
    # profile columns being added
    return ProfileOut(
        id=u.id, name=u.name, email=u.email,
        avatar_url=u.avatar_url or "",
        bio=u.bio or "",
        pronouns=u.pronouns or "",
        venmo_handle=u.venmo_handle or "",
        zelle_handle=u.zelle_handle or "",
        phone=u.phone or "",
        dietary_restrictions=u.dietary_restrictions or "",
        chore_preferences=u.chore_preferences or "",
        timezone=u.timezone or "America/New_York",
    )


# Avatar images are stored on the server's local disk under /uploads/avatars
# FastAPI serves the /uploads path as a static directory
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "avatars")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Accepted MIME types for uploaded avatars. Any other type is rejected
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2 MB upload limit


@router.get("/me", response_model=ProfileOut)
def get_profile(user: User = Depends(get_current_user)):
    # Return the current user's profile
    return _profile_out(user)


@router.patch("/me", response_model=ProfileOut)
def update_profile(
    data: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Partial update, Only fields included in the request body are modified
    # Each value is sanitized and trimmed to its maximum length before being
    # saved to the database
    if data.bio is not None:
        user.bio = sanitize_text(data.bio, 140)
    if data.pronouns is not None:
        user.pronouns = sanitize_text(data.pronouns, 32)
    if data.venmo_handle is not None:
        user.venmo_handle = sanitize_text(data.venmo_handle, 64)
    if data.zelle_handle is not None:
        user.zelle_handle = sanitize_text(data.zelle_handle, 64)
    if data.phone is not None:
        user.phone = sanitize_text(data.phone, 32)
    if data.dietary_restrictions is not None:
        user.dietary_restrictions = sanitize_text(data.dietary_restrictions, 128)
    if data.chore_preferences is not None:
        user.chore_preferences = sanitize_text(data.chore_preferences, 280)
    if data.timezone is not None:
        user.timezone = sanitize_text(data.timezone, 64) or "America/New_York"
    db.commit()
    db.refresh(user)
    return _profile_out(user)


@router.post("/avatar", response_model=ProfileOut)
async def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Validate the MIME type before reading the file body into memory
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Use JPEG, PNG, WebP, or GIF")
    data = await file.read()
    if len(data) > MAX_AVATAR_BYTES:
        raise HTTPException(400, "Avatar must be under 2 MB")

    # Choose the file extension based on the MIME type rather than the
    # original filename. A short random suffix is added so that filenames
    # cannot be guessed from a user's ID
    ext = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }[file.content_type]
    filename = f"{user.id}-{uuid.uuid4().hex[:8]}{ext}"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        f.write(data)

    # Remove the previous avatar file from disk to avoid accumulating
    # stale uploads when a user replaces their image
    if user.avatar_url and user.avatar_url.startswith("/uploads/"):
        old = os.path.join(os.path.dirname(__file__), "..", user.avatar_url.lstrip("/"))
        if os.path.isfile(old):
            try:
                os.remove(old)
            except OSError:
                pass

    user.avatar_url = f"/uploads/avatars/{filename}"
    db.commit()
    db.refresh(user)
    return _profile_out(user)
