import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.notification import NotificationChannel, NotificationType


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: NotificationType
    channel: NotificationChannel
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool
    read_at: Optional[datetime] = None
    data: Optional[dict[str, Any]] = None
    created_at: datetime


class NotificationListResponse(BaseModel):
    items: list[NotificationRead]
    total: int
    unread_count: int


class UnreadCountResponse(BaseModel):
    unread_count: int


class NotificationPreferenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    order_updates_in_app: bool
    order_updates_email: bool
    promotions_in_app: bool
    promotions_email: bool
    loyalty_in_app: bool
    loyalty_email: bool
    updated_at: datetime


class NotificationPreferenceUpdate(BaseModel):
    order_updates_in_app: Optional[bool] = None
    order_updates_email: Optional[bool] = None
    promotions_in_app: Optional[bool] = None
    promotions_email: Optional[bool] = None
    loyalty_in_app: Optional[bool] = None
    loyalty_email: Optional[bool] = None


class AdminBroadcastRequest(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    message: str = Field(min_length=5, max_length=2000)
    link: Optional[str] = Field(default=None, max_length=500)
    target_role: Optional[str] = None

