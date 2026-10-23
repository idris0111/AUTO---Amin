from collections import defaultdict, deque
from threading import Lock
from time import monotonic
from typing import Callable

from fastapi import HTTPException, Request, status

from app.config import get_settings


class SlidingWindowRateLimiter:
    """Thread-safe sliding window rate limiter."""

    def __init__(self, limit: int, window_seconds: int, name: str = "RateLimiter") -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self.name = name
        self._attempts: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, request: Request, custom_key: str | None = None) -> None:
        settings = get_settings()
        if settings.app_env == "test":
            return

        key = custom_key or (request.client.host if request.client else "unknown")
        now = monotonic()
        cutoff = now - self.window_seconds
        with self._lock:
            attempts = self._attempts[key]
            while attempts and attempts[0] <= cutoff:
                attempts.popleft()
            if len(attempts) >= self.limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many requests. Please try again later.",
                    headers={"Retry-After": str(self.window_seconds)},
                )
            attempts.append(now)

    def reset(self, request: Request, custom_key: str | None = None) -> None:
        key = custom_key or (request.client.host if request.client else "unknown")
        with self._lock:
            self._attempts.pop(key, None)


class LoginRateLimiter:
    """Config-driven login rate limiter."""

    def __init__(self) -> None:
        self._attempts: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, request: Request) -> None:
        settings = get_settings()
        key = request.client.host if request.client else "unknown"
        now = monotonic()
        cutoff = now - settings.login_rate_window_seconds
        with self._lock:
            attempts = self._attempts[key]
            while attempts and attempts[0] <= cutoff:
                attempts.popleft()
            if len(attempts) >= settings.login_rate_limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many login attempts. Try again later.",
                    headers={"Retry-After": str(settings.login_rate_window_seconds)},
                )
            attempts.append(now)

    def reset(self, request: Request) -> None:
        key = request.client.host if request.client else "unknown"
        with self._lock:
            self._attempts.pop(key, None)


login_rate_limiter = LoginRateLimiter()
# Register: allow up to 20 registrations per 5 minutes per IP
register_rate_limiter = SlidingWindowRateLimiter(limit=20, window_seconds=300, name="RegisterRateLimiter")
