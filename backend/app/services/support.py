"""Customer support ticketing: customers open tickets, staff replies in a threaded conversation."""

import secrets
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.commerce import Order
from app.models.support import (
    FINAL_TICKET_STATUSES,
    SupportTicket,
    TicketMessage,
    TicketPriority,
    TicketStatus,
)
from app.models.user import User
from app.schemas.support import (
    TicketAdminUpdate,
    TicketCreate,
    TicketDetail,
    TicketMessageRead,
    TicketSummary,
)

TICKET_LOADS = (
    selectinload(SupportTicket.messages).selectinload(TicketMessage.author),
    selectinload(SupportTicket.user),
    selectinload(SupportTicket.assignee),
    selectinload(SupportTicket.order),
)

STATUS_RU = {
    TicketStatus.OPEN: "Открыто",
    TicketStatus.IN_PROGRESS: "В работе",
    TicketStatus.AWAITING_CUSTOMER: "Ожидает вашего ответа",
    TicketStatus.RESOLVED: "Решено",
    TicketStatus.CLOSED: "Закрыто",
}


def _full_name(user: User | None) -> str:
    if user is None:
        return "Удалённый пользователь"
    name = f"{user.first_name or ''} {user.last_name or ''}".strip()
    return name or user.email


def _now() -> datetime:
    return datetime.now(UTC)


def _next_ticket_number(db: Session) -> str:
    day = _now().strftime("%Y%m%d")
    for _ in range(8):
        candidate = f"SUP-{day}-{secrets.token_hex(2).upper()}"
        if db.scalar(select(SupportTicket.id).where(SupportTicket.number == candidate)) is None:
            return candidate
    raise HTTPException(status_code=503, detail="Could not allocate a ticket number, try again")


def to_summary(ticket: SupportTicket, *, for_staff: bool) -> TicketSummary:
    last = ticket.messages[-1] if ticket.messages else None
    preview = (last.body[:120] + "…") if last and len(last.body) > 120 else (last.body if last else "")
    return TicketSummary(
        id=ticket.id,
        number=ticket.number,
        subject=ticket.subject,
        category=ticket.category,
        priority=ticket.priority,
        status=ticket.status,
        order_id=ticket.order_id,
        order_number=ticket.order.number if ticket.order else None,
        customer_name=_full_name(ticket.user),
        customer_email=ticket.user.email if ticket.user else "",
        assignee_name=_full_name(ticket.assignee) if ticket.assignee else None,
        unread=ticket.staff_unread if for_staff else ticket.customer_unread,
        messages_count=len(ticket.messages),
        last_message_preview=preview,
        created_at=ticket.created_at,
        last_message_at=ticket.last_message_at,
    )


def to_detail(ticket: SupportTicket, *, for_staff: bool) -> TicketDetail:
    summary = to_summary(ticket, for_staff=for_staff)
    messages = [
        TicketMessageRead(
            id=m.id,
            is_staff=m.is_staff,
            author_name=("Поддержка AutoUniverse · " + _full_name(m.author)) if m.is_staff else _full_name(m.author),
            body=m.body,
            created_at=m.created_at,
        )
        for m in ticket.messages
    ]
    return TicketDetail(**summary.model_dump(), messages=messages)


def _load(db: Session, ticket_id: uuid.UUID) -> SupportTicket | None:
    return db.scalar(
        select(SupportTicket)
        .options(*TICKET_LOADS)
        .where(SupportTicket.id == ticket_id)
        .execution_options(populate_existing=True)
    )


def get_customer_ticket(db: Session, user: User, ticket_id: uuid.UUID) -> SupportTicket:
    ticket = _load(db, ticket_id)
    # 404 (not 403) for foreign tickets so ticket ids cannot be probed.
    if ticket is None or ticket.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


def get_staff_ticket(db: Session, ticket_id: uuid.UUID) -> SupportTicket:
    ticket = _load(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


def create_ticket(db: Session, user: User, data: TicketCreate) -> SupportTicket:
    if data.order_id is not None:
        owns_order = db.scalar(
            select(Order.id).where(Order.id == data.order_id, Order.user_id == user.id)
        )
        if owns_order is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    now = _now()
    ticket = SupportTicket(
        number=_next_ticket_number(db),
        user_id=user.id,
        order_id=data.order_id,
        subject=data.subject.strip(),
        category=data.category,
        priority=TicketPriority.NORMAL,
        status=TicketStatus.OPEN,
        staff_unread=True,
        customer_unread=False,
        last_message_at=now,
    )
    db.add(ticket)
    db.flush()
    db.add(TicketMessage(ticket_id=ticket.id, author_id=user.id, is_staff=False, body=data.message.strip()))
    db.commit()
    return get_customer_ticket(db, user, ticket.id)


def list_customer_tickets(db: Session, user: User) -> tuple[list[SupportTicket], int]:
    tickets = list(
        db.scalars(
            select(SupportTicket)
            .options(*TICKET_LOADS)
            .where(SupportTicket.user_id == user.id)
            .order_by(SupportTicket.last_message_at.desc())
        )
    )
    unread = sum(1 for t in tickets if t.customer_unread)
    return tickets, unread


def customer_reply(db: Session, user: User, ticket: SupportTicket, body: str) -> SupportTicket:
    if ticket.status in FINAL_TICKET_STATUSES:
        # A new message re-opens a finished conversation instead of being lost.
        ticket.status = TicketStatus.OPEN
    elif ticket.status == TicketStatus.AWAITING_CUSTOMER:
        ticket.status = TicketStatus.IN_PROGRESS
    db.add(TicketMessage(ticket_id=ticket.id, author_id=user.id, is_staff=False, body=body.strip()))
    ticket.staff_unread = True
    ticket.last_message_at = _now()
    db.commit()
    db.expire(ticket, ["messages"])
    return get_customer_ticket(db, user, ticket.id)


def customer_close(db: Session, user: User, ticket: SupportTicket) -> SupportTicket:
    ticket.status = TicketStatus.CLOSED
    ticket.customer_unread = False
    db.commit()
    return get_customer_ticket(db, user, ticket.id)


def mark_customer_read(db: Session, ticket: SupportTicket) -> None:
    if ticket.customer_unread:
        ticket.customer_unread = False
        db.commit()


def mark_staff_read(db: Session, ticket: SupportTicket) -> None:
    if ticket.staff_unread:
        ticket.staff_unread = False
        db.commit()


def list_staff_tickets(
    db: Session,
    ticket_status: TicketStatus | None,
    q: str | None,
    offset: int,
    limit: int,
) -> tuple[list[SupportTicket], int, int]:
    stmt = select(SupportTicket)
    if ticket_status is not None:
        stmt = stmt.where(SupportTicket.status == ticket_status)
    if q and q.strip():
        pattern = f"%{q.strip()}%"
        stmt = stmt.join(User, User.id == SupportTicket.user_id).where(
            or_(
                SupportTicket.number.ilike(pattern),
                SupportTicket.subject.ilike(pattern),
                User.email.ilike(pattern),
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
            )
        )
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    tickets = list(
        db.scalars(
            stmt.options(*TICKET_LOADS)
            .order_by(SupportTicket.staff_unread.desc(), SupportTicket.last_message_at.desc())
            .offset(offset)
            .limit(limit)
        )
    )
    unread = (
        db.scalar(
            select(func.count(SupportTicket.id)).where(
                SupportTicket.staff_unread == True,  # noqa: E712
                SupportTicket.status.not_in(list(FINAL_TICKET_STATUSES)),
            )
        )
        or 0
    )
    return tickets, total, unread


def staff_reply(db: Session, staff: User, ticket: SupportTicket, body: str) -> SupportTicket:
    db.add(TicketMessage(ticket_id=ticket.id, author_id=staff.id, is_staff=True, body=body.strip()))
    if ticket.assigned_to is None:
        ticket.assigned_to = staff.id
    ticket.status = TicketStatus.AWAITING_CUSTOMER
    ticket.customer_unread = True
    ticket.staff_unread = False
    ticket.last_message_at = _now()
    db.commit()
    db.expire(ticket, ["messages"])

    try:
        from app.models.notification import NotificationType
        from app.services import notifications as notifications_service

        preview = body.strip()
        if len(preview) > 160:
            preview = preview[:160] + "…"
        notifications_service.create_notification(
            db=db,
            user_id=ticket.user_id,
            type=NotificationType.SUPPORT_REPLY,
            title=f"Ответ поддержки по обращению {ticket.number}",
            message=preview,
            link=f"/support?ticket={ticket.id}",
            data={"ticket_id": str(ticket.id), "ticket_number": ticket.number},
        )
    except Exception:
        # Notification delivery must never break the support conversation.
        pass

    return get_staff_ticket(db, ticket.id)


def staff_update(db: Session, staff: User, ticket: SupportTicket, data: TicketAdminUpdate) -> SupportTicket:
    old_status = ticket.status
    if data.priority is not None:
        ticket.priority = data.priority
    if data.assign_to_me:
        ticket.assigned_to = staff.id
    if data.status is not None:
        ticket.status = data.status
    db.commit()

    if data.status is not None and data.status != old_status and data.status in FINAL_TICKET_STATUSES:
        try:
            from app.models.notification import NotificationType
            from app.services import notifications as notifications_service

            notifications_service.create_notification(
                db=db,
                user_id=ticket.user_id,
                type=NotificationType.SUPPORT_REPLY,
                title=f"Обращение {ticket.number}: {STATUS_RU[data.status]}",
                message=f"Статус обращения «{ticket.subject}» изменён на «{STATUS_RU[data.status]}».",
                link=f"/support?ticket={ticket.id}",
                data={"ticket_id": str(ticket.id), "ticket_number": ticket.number},
            )
        except Exception:
            pass

    return get_staff_ticket(db, ticket.id)

