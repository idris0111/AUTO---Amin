import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ShippingZoneCreate(BaseModel):
    city: str = Field(min_length=1, max_length=100)
    region: str | None = Field(default=None, max_length=100)
    fee: Decimal = Field(ge=0)
    free_from: Decimal | None = Field(default=None, ge=0)
    eta_days_min: int = Field(default=1, ge=0)
    eta_days_max: int = Field(default=3, ge=0)
    is_active: bool = True


class ShippingZoneUpdate(BaseModel):
    region: str | None = Field(default=None, max_length=100)
    fee: Decimal | None = Field(default=None, ge=0)
    free_from: Decimal | None = Field(default=None, ge=0)
    eta_days_min: int | None = Field(default=None, ge=0)
    eta_days_max: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class ShippingZoneRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    city: str
    region: str | None
    fee: Decimal
    free_from: Decimal | None
    eta_days_min: int
    eta_days_max: int
    is_active: bool


class ShippingQuoteRequest(BaseModel):
    city: str = Field(min_length=1, max_length=100)
    subtotal: Decimal = Field(ge=0)


class ShippingQuoteRead(BaseModel):
    city: str
    fee: Decimal
    eta_days_min: int
    eta_days_max: int
    zone_found: bool
