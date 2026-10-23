import uuid
from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.permissions import ROLE_PERMISSIONS, Permission, permissions_for
from app.core.security import decode_token
from app.database import get_db
from app.models.user import User

__all__ = [
    "Permission",
    "ROLE_PERMISSIONS",
    "get_current_user",
    "get_current_user_optional",
    "require_any_permission",
    "require_permission",
]

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Valid authentication is required",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise credentials_error
    try:
        payload = decode_token(credentials.credentials, "access")
        user_id = uuid.UUID(payload["sub"])
    except (ValueError, TypeError):
        raise credentials_error
    user = db.get(User, user_id)
    if (
        user is None
        or not user.is_active
        or payload.get("ver") != user.token_version
    ):
        raise credentials_error
    return user


def require_permission(permission: Permission) -> Callable[..., User]:
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if permission not in permissions_for(current_user.role):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user

    return dependency


def require_any_permission(*permissions: Permission) -> Callable[..., User]:
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        granted = permissions_for(current_user.role)
        if not any(permission in granted for permission in permissions):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user

    return dependency


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    if credentials is None:
        return None
    try:
        return get_current_user(credentials=credentials, db=db)
    except HTTPException:
        return None
