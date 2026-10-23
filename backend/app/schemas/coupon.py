import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.coupon import CouponType


class CouponCreate(BaseModel):
    code: str = Field(min_length=3, max_length=40)
    type: CouponType
    value: Decimal = Field(gt=0)
    min_order_amount: Decimal = Field(default=Decimal("0"), ge=0)
    max_uses: int | None = Field(default=None, ge=1)
    starts_at: datetime | None = None
    expires_at: datetime | None = None
    is_active: bool = True


class CouponUpdate(BaseModel):
    value: Decimal | None = Field(default=None, gt=0)
    min_order_amount: Decimal | None = Field(default=None, ge=0)
    max_uses: int | None = Field(default=None, ge=1)
    starts_at: datetime | None = None
    expires_at: datetime | None = None
    is_active: bool | None = None


class CouponRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    type: CouponType
    value: Decimal
    min_order_amount: Decimal
    max_uses: int | None
    used_count: int
    starts_at: datetime | None
    expires_at: datetime | None
    is_active: bool


class CouponValidateRequest(BaseModel):
    code: str = Field(min_length=3, max_length=40)
    subtotal: Decimal = Field(gt=0)


class CouponValidateResult(BaseModel):
    code: str
    discount: Decimal
