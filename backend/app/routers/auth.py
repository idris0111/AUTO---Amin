import uuid

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.core.rate_limit import login_rate_limiter, register_rate_limiter
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    SessionRead,
    TokenPair,
)
from app.schemas.user import UserRead
from app.services.auth import (
    authenticate,
    issue_token_pair,
    list_active_sessions,
    register,
    revoke_all_sessions,
    revoke_refresh_token,
    revoke_session,
    rotate_refresh_token,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(data: RegisterRequest, request: Request, db: Session = Depends(get_db)) -> User:
    register_rate_limiter.check(request)
    return register(db, data)


@router.post("/login", response_model=TokenPair)
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenPair:
    login_rate_limiter.check(request)
    user = authenticate(db, str(data.email), data.password)
    login_rate_limiter.reset(request)
    return issue_token_pair(db, user)


@router.post("/refresh", response_model=TokenPair)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)) -> TokenPair:
    return rotate_refresh_token(db, data.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    data: LogoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    revoke_refresh_token(db, data.refresh_token, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/sessions", response_model=list[SessionRead])
def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SessionRead]:
    return [
        SessionRead(id=s.id, created_at=s.created_at, expires_at=s.expires_at)
        for s in list_active_sessions(db, current_user)
    ]


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    revoke_session(db, current_user, session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/sessions", status_code=status.HTTP_204_NO_CONTENT)
def delete_all_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    revoke_all_sessions(db, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

