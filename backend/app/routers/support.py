import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import Permission, get_current_user, require_permission
from app.models.support import TicketStatus
from app.models.user import User
from app.schemas.support import (
    TicketAdminUpdate,
    TicketCreate,
    TicketDetail,
    TicketListResponse,
    TicketMessageCreate,
)
from app.services import support as support_service

router = APIRouter(tags=["Customer Support"])


# ---------------------------------------------------------------- customer side


@router.post("/support/tickets", response_model=TicketDetail, status_code=status.HTTP_201_CREATED)
def create_ticket(
    data: TicketCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TicketDetail:
    ticket = support_service.create_ticket(db, user, data)
    return support_service.to_detail(ticket, for_staff=False)


@router.get("/support/tickets", response_model=TicketListResponse)
def list_my_tickets(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TicketListResponse:
    tickets, unread = support_service.list_customer_tickets(db, user)
    return TicketListResponse(
        items=[support_service.to_summary(t, for_staff=False) for t in tickets],
        total=len(tickets),
        unread_count=unread,
    )


@router.get("/support/tickets/{ticket_id}", response_model=TicketDetail)
def get_my_ticket(
    ticket_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TicketDetail:
    ticket = support_service.get_customer_ticket(db, user, ticket_id)
    support_service.mark_customer_read(db, ticket)
    return support_service.to_detail(ticket, for_staff=False)


@router.post("/support/tickets/{ticket_id}/messages", response_model=TicketDetail)
def reply_to_my_ticket(
    ticket_id: uuid.UUID,
    data: TicketMessageCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TicketDetail:
    ticket = support_service.get_customer_ticket(db, user, ticket_id)
    ticket = support_service.customer_reply(db, user, ticket, data.body)
    return support_service.to_detail(ticket, for_staff=False)


@router.post("/support/tickets/{ticket_id}/close", response_model=TicketDetail)
def close_my_ticket(
    ticket_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TicketDetail:
    ticket = support_service.get_customer_ticket(db, user, ticket_id)
    ticket = support_service.customer_close(db, user, ticket)
    return support_service.to_detail(ticket, for_staff=False)


# ------------------------------------------------------------------- staff side


@router.get("/admin/support/tickets", response_model=TicketListResponse)
def staff_list_tickets(
    ticket_status: TicketStatus | None = Query(default=None, alias="status"),
    q: str | None = Query(default=None, max_length=100),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    _: User = Depends(require_permission(Permission.MANAGE_SUPPORT)),
    db: Session = Depends(get_db),
) -> TicketListResponse:
    tickets, total, unread = support_service.list_staff_tickets(db, ticket_status, q, offset, limit)
    return TicketListResponse(
        items=[support_service.to_summary(t, for_staff=True) for t in tickets],
        total=total,
        unread_count=unread,
    )


@router.get("/admin/support/tickets/{ticket_id}", response_model=TicketDetail)
def staff_get_ticket(
    ticket_id: uuid.UUID,
    _: User = Depends(require_permission(Permission.MANAGE_SUPPORT)),
    db: Session = Depends(get_db),
) -> TicketDetail:
    ticket = support_service.get_staff_ticket(db, ticket_id)
    support_service.mark_staff_read(db, ticket)
    return support_service.to_detail(ticket, for_staff=True)


@router.post("/admin/support/tickets/{ticket_id}/messages", response_model=TicketDetail)
def staff_reply(
    ticket_id: uuid.UUID,
    data: TicketMessageCreate,
    staff: User = Depends(require_permission(Permission.MANAGE_SUPPORT)),
    db: Session = Depends(get_db),
) -> TicketDetail:
    ticket = support_service.get_staff_ticket(db, ticket_id)
    ticket = support_service.staff_reply(db, staff, ticket, data.body)
    return support_service.to_detail(ticket, for_staff=True)


@router.patch("/admin/support/tickets/{ticket_id}", response_model=TicketDetail)
def staff_update_ticket(
    ticket_id: uuid.UUID,
    data: TicketAdminUpdate,
    staff: User = Depends(require_permission(Permission.MANAGE_SUPPORT)),
    db: Session = Depends(get_db),
) -> TicketDetail:
    ticket = support_service.get_staff_ticket(db, ticket_id)
    ticket = support_service.staff_update(db, staff, ticket, data)
    return support_service.to_detail(ticket, for_staff=True)

