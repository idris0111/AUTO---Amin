import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.support import TicketCategory, TicketPriority, TicketStatus


class TicketCreate(BaseModel):
    subject: str = Field(min_length=3, max_length=200)
    category: TicketCategory = TicketCategory.OTHER
    message: str = Field(min_length=5, max_length=5000)
    order_id: Optional[uuid.UUID] = None


class TicketMessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


class TicketMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_staff: bool
    author_name: str
    body: str
    created_at: datetime


class TicketSummary(BaseModel):
    id: uuid.UUID
    number: str
    subject: str
    category: TicketCategory
    priority: TicketPriority
    status: TicketStatus
    order_id: Optional[uuid.UUID] = None
    order_number: Optional[str] = None
    customer_name: str
    customer_email: str
    assignee_name: Optional[str] = None
    unread: bool
    messages_count: int
    last_message_preview: str
    created_at: datetime
    last_message_at: datetime


class TicketDetail(TicketSummary):
    messages: list[TicketMessageRead]


class TicketListResponse(BaseModel):
    items: list[TicketSummary]
    total: int
    unread_count: int


class TicketAdminUpdate(BaseModel):
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    assign_to_me: Optional[bool] = None

