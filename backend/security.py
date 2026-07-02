from __future__ import annotations

# defensive helpers used across the api: text sanitizing, urgency normalizing,
# and a small in-process rate limiter to slow down brute-force attempts

import html
import os
import re
import time
from collections import defaultdict
from typing import Optional

from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

# very basic html tag stripper. we then re-escape anything left so user text
# can't sneak script tags into the page when it's rendered later
_TAG_RE = re.compile(r"<[^>]+>")


def sanitize_text(value: str, max_len: Optional[int] = None) -> str:
    # run user-typed text through this before storing it. order matters:
    # strip tags, unescape any leftover entities, then re-escape cleanly
    if not value:
        return ""
    cleaned = _TAG_RE.sub("", value)
    cleaned = html.unescape(cleaned)
    cleaned = html.escape(cleaned, quote=False)
    if max_len is not None:
        cleaned = cleaned[:max_len]
    return cleaned.strip()


# only these three values are accepted for announcement/maintenance urgency
ALLOWED_URGENCY = {"low", "normal", "high"}


def normalize_urgency(value: str) -> str:
    # accept any casing and fall back to "normal" if it's not on the list
    v = (value or "normal").lower().strip()
    return v if v in ALLOWED_URGENCY else "normal"


# bare-bones in-memory rate limiter
# one process only, which is fine for a
# single render service. would need redis if we ever ran multiple workers
class RateLimiter:
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        # key -> list of timestamps in the current window
        self._hits: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str) -> None:
        # raises 429 if this key has exceeded its budget in the last window.
        # otherwise records the hit and returns
        now = time.time()
        window_start = now - self.window_seconds
        hits = [t for t in self._hits[key] if t > window_start]
        if len(hits) >= self.max_requests:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                "Too many attempts. Try again in a minute.",
            )
        hits.append(now)
        self._hits[key] = hits


auth_rate_limiter = RateLimiter(max_requests=10, window_seconds=60)


class RateLimitMiddleware(BaseHTTPMiddleware):
    # slows down anyone trying to brute-force login/register/join codes
    # rate-limits per client ip, not per user (we don't know the user yet)

    # any POST to these paths counts against the per-ip budget
    # /join is in here because a bot could otherwise brute-force invite codes
    PROTECTED = ("/api/auth/login", "/api/auth/register", "/api/houses/join")

    async def dispatch(self, request: Request, call_next):
        if os.environ.get("TESTING") == "1":
            return await call_next(request)
        path = request.url.path
        if path in self.PROTECTED and request.method == "POST":
            ip = request.client.host if request.client else "unknown"
            auth_rate_limiter.check(f"{ip}:{path}")
        return await call_next(request)


class OriginCheckMiddleware(BaseHTTPMiddleware):
    # Blocks cross-site state-changing requests. Our auth cookie uses
    # SameSite=None in production so it rides along on any cross-site
    # POST that the CORS preflight lets through. multipart uploads and
    # form posts are "simple requests" with no preflight, so without this
    # check a form on evil.com could invoke our write endpoints while a
    # user is logged in. Browsers always attach the Origin header to
    # cross-site POST/PUT/PATCH/DELETE. If it is present and not in the
    # configured allowlist, refuse the request
    UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

    def __init__(self, app, allowed_origins: list[str]):
        super().__init__(app)
        self._allowed = set(allowed_origins)

    async def dispatch(self, request: Request, call_next):
        if os.environ.get("TESTING") == "1":
            return await call_next(request)
        if request.method in self.UNSAFE_METHODS:
            origin = request.headers.get("origin")
            # Non-browser clients (curl, Postman, mobile apps) often omit
            # Origin. Those cannot be CSRF-forced, so they are allowed
            if origin and origin not in self._allowed:
                return JSONResponse(
                    {"detail": "Origin not allowed"},
                    status_code=status.HTTP_403_FORBIDDEN,
                )
        return await call_next(request)


# A frozen bcrypt hash used to burn the same CPU as a real verify when the
# email in a login attempt does not exist. Prevents timing-based email
# enumeration since bcrypt is the dominant cost in the login path
_DUMMY_BCRYPT_HASH = (
    "$2b$12$abcdefghijklmnopqrstuv"
    "wxyzABCDEFGHIJKLMNOPQRSTUVWXYZ01"
)


def constant_time_password_verify(plain: str, hashed: Optional[str]) -> bool:
    # If the user record does not exist, hashed is None. Run bcrypt on the
    # dummy hash so the response time matches the real-user path, then
    # return False. Keep the actual comparison for existing users
    from auth import verify_password as _verify
    if hashed is None:
        try:
            _verify(plain, _DUMMY_BCRYPT_HASH)
        except Exception:
            pass
        return False
    return _verify(plain, hashed)


def require_member_of(db, house_id: int, target_user_id: int) -> None:
    # Guard for endpoints that accept a foreign user id as input (chore
    # assignee, expense split target, quiet-hours offender, etc.). Rejects
    # the request if the referenced user is not a member of this house.
    # Prevents cross-house user enumeration and framing attacks where an
    # attacker names or assigns something to a user in an unrelated house
    from models import HouseMember
    mem = (
        db.query(HouseMember)
        .filter(HouseMember.house_id == house_id, HouseMember.user_id == target_user_id)
        .first()
    )
    if not mem:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "User is not a member of this house")
