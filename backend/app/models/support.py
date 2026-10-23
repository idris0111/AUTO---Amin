import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Enum, ForeignKey, Index, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.types import UTCDateTime
from app.database import Base


class TicketStatus(str, enum.Enum):
    OPEN = "open"                    # created by customer, waiting for staff
    IN_PROGRESS = "in_progress"      # staff picked it up
    AWAITING_CUSTOMER = "awaiting_customer"  # staff replied, waiting for customer
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketCategory(str, enum.Enum):
    ORDER = "order"
    DELIVERY = "delivery"
    PART_SELECTION = "part_selection"  # help picking a compatible part
    RETURN = "return"
    PAYMENT = "payment"
    OTHER = "other"


class TicketPriority(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


ticket_status_enum = Enum(TicketStatus, name="ticket_status", native_enum=False, create_constraint=False, length=32)
ticket_category_enum = Enum(TicketCategory, name="ticket_category", native_enum=False, create_constraint=False, length=32)
ticket_priority_enum = Enum(TicketPriority, name="ticket_priority", native_enum=False, create_constraint=False, length=32)

# Statuses in which the conversation is finished; a new customer message re-opens it.
FINAL_TICKET_STATUSES = frozenset({TicketStatus.RESOLVED, TicketStatus.CLOSED})


class SupportTicket(Base):
    __tablename__ = "support_tickets"
    __table_args__ = (
        Index("ix_support_tickets_user_id", "user_id"),
        Index("ix_support_tickets_status", "status"),
        Index("ix_support_tickets_last_message_at", "last_message_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    number: Mapped[str] = mapped_column(String(32), unique=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    order_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("orders.id", ondelete="SET NULL"), nullable=True
    )
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    subject: Mapped[str] = mapped_column(String(200))
    category: Mapped[TicketCategory] = mapped_column(ticket_category_enum, default=TicketCategory.OTHER)
    priority: Mapped[TicketPriority] = mapped_column(ticket_priority_enum, default=TicketPriority.NORMAL)
    status: Mapped[TicketStatus] = mapped_column(ticket_status_enum, default=TicketStatus.OPEN)
    customer_unread: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    staff_unread: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now(), onupdate=func.now())
    last_message_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())

    user: Mapped["User"] = relationship(foreign_keys=[user_id])  # noqa: F821
    assignee: Mapped["User | None"] = relationship(foreign_keys=[assigned_to])  # noqa: F821
    order: Mapped["Order | None"] = relationship()  # noqa: F821
    messages: Mapped[list["TicketMessage"]] = relationship(
        back_populates="ticket", cascade="all, delete-orphan", order_by="TicketMessage.created_at"
    )


class TicketMessage(Base):
    __tablename__ = "support_ticket_messages"
    __table_args__ = (Index("ix_support_ticket_messages_ticket_id", "ticket_id"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("support_tickets.id", ondelete="CASCADE"))
    author_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    is_staff: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())

    ticket: Mapped[SupportTicket] = relationship(back_populates="messages")
    author: Mapped["User | None"] = relationship()  # noqa: F821

