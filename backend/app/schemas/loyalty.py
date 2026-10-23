import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.loyalty import LoyaltyTier, LoyaltyTransactionType


class LoyaltyTransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    amount: int
    balance_after: int
    type: LoyaltyTransactionType
    order_id: Optional[uuid.UUID] = None
    description: str
    created_at: datetime


class LoyaltyTierInfo(BaseModel):
    current_tier: LoyaltyTier
    cashback_rate: Decimal
    cashback_percent: int
    next_tier: Optional[LoyaltyTier] = None
    spent_current: Decimal
    spent_needed_for_next: Optional[Decimal] = None
    tier_progress_percent: int


class LoyaltyAccountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    points_balance: int
    lifetime_points: int
    total_spent: Decimal
    tier_info: LoyaltyTierInfo
    recent_transactions: list[LoyaltyTransactionRead] = []


class PointsApplyRequest(BaseModel):
    points: int = Field(default=0, ge=0)


class PointsApplyResponse(BaseModel):
    points_applied: int
    discount_amount: Decimal
    remaining_balance: int
    max_allowed_points: int


class AdminAdjustPointsRequest(BaseModel):
    amount: int
    description: str = Field(min_length=3, max_length=200)

