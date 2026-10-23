import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    create_token,
    decode_token,
    hash_password,
    token_fingerprint,
    verify_password,
)
from app.crud.users import create_user, get_user_by_email
from app.models.user import RefreshToken, User
from app.schemas.auth import RegisterRequest, TokenPair


def register(db: Session, data: RegisterRequest) -> User:
    if get_user_by_email(db, str(data.email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
    try:
        user = create_user(db, data, hash_password(data.password))
        db.commit()
        db.refresh(user)
        return user
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered") from exc


def authenticate(db: Session, email: str, password: str) -> User:
    user = get_user_by_email(db, email)
    password_is_valid = verify_password(password, user.password_hash if user else DUMMY_PASSWORD_HASH)
    if user is None or not password_is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is blocked")
    return user


def issue_token_pair(db: Session, user: User) -> TokenPair:
    settings = get_settings()
    access, _, _ = create_token(
        str(user.id),
        "access",
        timedelta(minutes=settings.access_token_expire_minutes),
        {"ver": user.token_version},
    )
    refresh, jti, expires_at = create_token(
        str(user.id), "refresh", timedelta(days=settings.refresh_token_expire_days)
    )
    db.add(
        RefreshToken(user_id=user.id, jti_hash=token_fingerprint(jti), expires_at=expires_at)
    )
    db.commit()
    return TokenPair(access_token=access, refresh_token=refresh)


def rotate_refresh_token(db: Session, raw_token: str) -> TokenPair:
    try:
        payload = decode_token(raw_token, "refresh")
        user_id = uuid.UUID(payload["sub"])
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    stored = db.scalar(
        select(RefreshToken)
        .where(RefreshToken.jti_hash == token_fingerprint(payload["jti"]))
        .with_for_update()
    )
    now = datetime.now(UTC)
    if stored is None or stored.revoked_at is not None or stored.expires_at <= now:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is revoked")
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is unavailable")
    stored.revoked_at = now
    return issue_token_pair(db, user)


def revoke_refresh_token(db: Session, raw_token: str, expected_user_id: uuid.UUID) -> None:
    try:
        payload = decode_token(raw_token, "refresh")
    except ValueError:
        return
    if payload.get("sub") != str(expected_user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token belongs to another user")
    stored = db.scalar(
        select(RefreshToken).where(RefreshToken.jti_hash == token_fingerprint(payload["jti"]))
    )
    if stored and stored.revoked_at is None:
        stored.revoked_at = datetime.now(UTC)
        db.commit()


def revoke_all_user_tokens(db: Session, user_id: uuid.UUID) -> None:
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )


def list_active_sessions(db: Session, user: User) -> list[RefreshToken]:
    now = datetime.now(UTC)
    return list(
        db.scalars(
            select(RefreshToken)
            .where(
                RefreshToken.user_id == user.id,
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > now,
            )
            .order_by(RefreshToken.created_at.desc())
        )
    )


def revoke_session(db: Session, user: User, session_id: uuid.UUID) -> None:
    stored = db.scalar(
        select(RefreshToken).where(RefreshToken.id == session_id, RefreshToken.user_id == user.id)
    )
    if stored is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if stored.revoked_at is None:
        stored.revoked_at = datetime.now(UTC)
        db.commit()


def revoke_all_sessions(db: Session, user: User) -> None:
    revoke_all_user_tokens(db, user.id)
    db.commit()

