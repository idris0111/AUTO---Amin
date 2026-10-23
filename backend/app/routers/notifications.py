import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import Permission, get_current_user, require_permission
from app.models.notification import Notification, NotificationPreference
from app.models.user import User
from app.schemas.notification import (
    AdminBroadcastRequest,
    NotificationListResponse,
    NotificationPreferenceRead,
    NotificationPreferenceUpdate,
    NotificationRead,
    UnreadCountResponse,
)
from app.services import notifications as notif_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=NotificationListResponse)
def get_my_notifications(
    unread_only: bool = False,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationListResponse:
    """Return paginated notifications for current user with total and unread count."""
    base_stmt = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        base_stmt = base_stmt.where(Notification.is_read == False)

    total = db.scalar(select(func.count()).select_from(base_stmt.subquery())) or 0
    unread_count = (
        db.scalar(
            select(func.count(Notification.id)).where(
                Notification.user_id == current_user.id, Notification.is_read == False
            )
        )
        or 0
    )

    items = list(
        db.scalars(
            base_stmt.order_by(Notification.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
    )

    return NotificationListResponse(
        items=[NotificationRead.model_validate(it) for it in items],
        total=total,
        unread_count=unread_count,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UnreadCountResponse:
    """Returns number of unread in-app notifications for header badge."""
    count = (
        db.scalar(
            select(func.count(Notification.id)).where(
                Notification.user_id == current_user.id, Notification.is_read == False
            )
        )
        or 0
    )
    return UnreadCountResponse(unread_count=count)


@router.patch("/{notification_id}/read", response_model=NotificationRead)
def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationRead:
    notif = db.scalar(
        select(Notification).where(
            Notification.id == notification_id, Notification.user_id == current_user.id
        )
    )
    if notif is None:
        raise HTTPException(status_code=404, detail="Notification not found")

    if not notif.is_read:
        notif.is_read = True
        notif.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notif)

    return NotificationRead.model_validate(notif)


@router.post("/mark-all-read")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    now = datetime.now(timezone.utc)
    db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)
        .values(is_read=True, read_at=now)
    )
    db.commit()
    return {"status": "ok"}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    notif = db.scalar(
        select(Notification).where(
            Notification.id == notification_id, Notification.user_id == current_user.id
        )
    )
    if notif is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notif)
    db.commit()


@router.get("/preferences", response_model=NotificationPreferenceRead)
def get_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationPreferenceRead:
    pref = notif_service.get_or_create_preferences(db, current_user.id)
    return NotificationPreferenceRead.model_validate(pref)


@router.put("/preferences", response_model=NotificationPreferenceRead)
@router.patch("/preferences", response_model=NotificationPreferenceRead)
def update_preferences(
    data: NotificationPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationPreferenceRead:
    pref = notif_service.get_or_create_preferences(db, current_user.id)
    payload = data.model_dump(exclude_unset=True)
    for field, val in payload.items():
        setattr(pref, field, val)

    db.commit()
    db.refresh(pref)
    return NotificationPreferenceRead.model_validate(pref)


@router.post("/admin/broadcast")
def admin_broadcast(
    data: AdminBroadcastRequest,
    _: User = Depends(require_permission(Permission.MANAGE_USERS)),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    """Broadcast announcement to users."""
    created_count = notif_service.broadcast_notification(
        db=db,
        title=data.title,
        message=data.message,
        link=data.link,
        target_role=data.target_role,
    )
    return {"sent_count": created_count}
