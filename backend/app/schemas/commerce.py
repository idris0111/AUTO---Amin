import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.commerce import OrderStatus, PaymentMethod, ShippingMethod


class CartItemAdd(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(default=1, ge=1, le=999)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=0, le=999)


class CartItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    product_name: str | None = None
    product_slug: str | None = None
    product_image: str | None = None
    quantity: int
    unit_price: Decimal
    line_total: Decimal
    stock_quantity: int | None = None


class CartRead(BaseModel):
    id: uuid.UUID
    items: list[CartItemRead] = []
    subtotal: Decimal = Decimal("0")
    count: int = 0


class CheckoutRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    contact_name: str = Field(min_length=1, max_length=200)
    contact_phone: str = Field(min_length=3, max_length=32)
    contact_email: EmailStr | None = None
    shipping_method: ShippingMethod = ShippingMethod.COURIER
    payment_method: PaymentMethod = PaymentMethod.CASH_ON_DELIVERY
    shipping_city: str = Field(min_length=1, max_length=100)
    shipping_street: str = Field(min_length=1, max_length=255)
    shipping_postal_code: str | None = Field(default=None, max_length=20)
    customer_note: str | None = Field(default=None, max_length=2000)
    coupon_code: str | None = Field(default=None, max_length=40)
    points_to_redeem: int = Field(default=0, ge=0)


class OrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    product_sku: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class OrderStatusEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    from_status: OrderStatus | None
    to_status: OrderStatus
    note: str | None
    created_at: datetime


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    number: str
    status: OrderStatus
    shipping_method: ShippingMethod
    payment_method: PaymentMethod
    subtotal: Decimal
    shipping_cost: Decimal
    discount: Decimal
    coupon_code: str | None = None
    points_redeemed: int = 0
    points_discount: Decimal = Decimal("0")
    total: Decimal
    currency: str
    contact_name: str
    contact_phone: str
    contact_email: str
    shipping_city: str
    shipping_street: str
    shipping_postal_code: str | None
    customer_note: str | None
    created_at: datetime
    items: list[OrderItemRead] = []
    status_history: list[OrderStatusEventRead] = []


class OrderListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    number: str
    status: OrderStatus
    total: Decimal
    currency: str
    created_at: datetime
    items_count: int = 0


class PaginatedOrders(BaseModel):
    items: list[OrderListItem]
    total: int
    offset: int
    limit: int


class QuickOrderRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    product_id: uuid.UUID
    quantity: int = Field(default=1, ge=1, le=99)
    customer_name: str = Field(min_length=1, max_length=200)
    customer_phone: str = Field(min_length=3, max_length=32)
    contact_method: str = Field(default="phone", max_length=20)
    comment: str | None = Field(default=None, max_length=1000)


class QuickOrderResponse(BaseModel):
    order_id: uuid.UUID
    order_number: str
    total: Decimal
    currency: str
    message: str
