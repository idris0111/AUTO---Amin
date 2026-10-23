import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, Enum, ForeignKey, Index, String, Text
from sqlalchemy.dialects.sqlite import JSON as SQLiteJSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func, text

from app.database import Base
from app.models.catalog import UTCDateTime


class NotificationType(str, enum.Enum):
    ORDER_CREATED = "order_created"
    ORDER_STATUS_CHANGED = "order_status_changed"
    LOYALTY_BONUS = "loyalty_bonus"
    SYSTEM = "system"
    PRICE_ALERT = "price_alert"
    SUPPORT_REPLY = "support_reply"


class NotificationChannel(str, enum.Enum):
    IN_APP = "in_app"
    EMAIL = "email"


notification_type_enum = Enum(
    NotificationType, name="notification_type", native_enum=False, create_constraint=False
)
notification_channel_enum = Enum(
    NotificationChannel, name="notification_channel", native_enum=False, create_constraint=False
)


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_user_id_is_read", "user_id", "is_read"),
        Index("ix_notifications_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type: Mapped[NotificationType] = mapped_column(notification_type_enum, default=NotificationType.SYSTEM)
    channel: Mapped[NotificationChannel] = mapped_column(
        notification_channel_enum, default=NotificationChannel.IN_APP
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    read_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    data: Mapped[dict[str, Any] | None] = mapped_column(SQLiteJSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="notifications")  # noqa: F821


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    order_updates_in_app: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))
    order_updates_email: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))
    promotions_in_app: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))
    promotions_email: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    loyalty_in_app: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))
    loyalty_email: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship()  # noqa: F821

