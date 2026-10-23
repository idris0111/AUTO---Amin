import uuid

from fastapi import APIRouter, Depends, Header, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_current_user_optional
from app.models.commerce import Cart, Order
from app.models.user import User
from app.schemas.commerce import (
    CartItemAdd,
    CartItemRead,
    CartItemUpdate,
    CartRead,
    CheckoutRequest,
    QuickOrderRequest,
    QuickOrderResponse,
    OrderListItem,
    OrderRead,
    PaginatedOrders,
)
from app.services import commerce as commerce_service

cart_router = APIRouter(prefix="/cart", tags=["Cart"])
orders_router = APIRouter(prefix="/orders", tags=["Orders"])

GUEST_HEADER = "X-Guest-Id"


def _cart_response(cart) -> CartRead:
    items = []
    for item in cart.items:
        product = item.product
        image = product.images[0].url if product.images else None
        items.append(
            CartItemRead(
                id=item.id,
                product_id=item.product_id,
                product_name=product.name,
                product_slug=product.slug,
                product_image=image,
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_total=item.unit_price * item.quantity,
                stock_quantity=product.stock_quantity,
            )
        )
    totals = commerce_service.cart_totals(cart)
    return CartRead(id=cart.id, items=items, subtotal=totals["subtotal"], count=totals["count"])


def _get_cart(
    db: Session,
    user: User | None,
    guest_id: str | None,
):
    return commerce_service.get_or_create_cart(db, user, guest_id)


@cart_router.get("", response_model=CartRead)
def read_cart(
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
    x_guest_id: str | None = Header(default=None, alias=GUEST_HEADER),
) -> CartRead:
    cart = _get_cart(db, user, x_guest_id)
    return _cart_response(cart)


@cart_router.post("/merge", response_model=CartRead)
def merge_guest_cart(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    x_guest_id: str | None = Header(default=None, alias=GUEST_HEADER),
) -> CartRead:
    if x_guest_id:
        guest_cart = db.scalar(select(Cart).where(Cart.guest_id == x_guest_id))
        if guest_cart:
            cart = commerce_service.merge_carts(db, guest_cart, user)
            return _cart_response(cart)
    return _cart_response(_get_cart(db, user, None))


@cart_router.post("/items", response_model=CartRead, status_code=status.HTTP_201_CREATED)
def add_item(
    data: CartItemAdd,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
    x_guest_id: str | None = Header(default=None, alias=GUEST_HEADER),
) -> CartRead:
    cart = _get_cart(db, user, x_guest_id)
    return _cart_response(commerce_service.add_item(db, cart, data))


@cart_router.patch("/items/{item_id}", response_model=CartRead)
def update_item(
    item_id: uuid.UUID,
    data: CartItemUpdate,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
    x_guest_id: str | None = Header(default=None, alias=GUEST_HEADER),
) -> CartRead:
    cart = _get_cart(db, user, x_guest_id)
    return _cart_response(commerce_service.update_item(db, cart, item_id, data.quantity))


@cart_router.delete("/items/{item_id}", response_model=CartRead)
def remove_item(
    item_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
    x_guest_id: str | None = Header(default=None, alias=GUEST_HEADER),
) -> CartRead:
    cart = _get_cart(db, user, x_guest_id)
    return _cart_response(commerce_service.remove_item(db, cart, item_id))


@orders_router.post("/checkout", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def checkout(
    data: CheckoutRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    x_guest_id: str | None = Header(default=None, alias=GUEST_HEADER),
) -> Order:
    cart = _get_cart(db, user, x_guest_id)
    return commerce_service.create_order(db, user, cart, data)


@orders_router.get("", response_model=PaginatedOrders)
def list_orders(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    offset: int = 0,
    limit: int = 20,
) -> PaginatedOrders:
    orders, total = commerce_service.list_orders(db, user, offset, limit)
    items = [
        OrderListItem(
            id=order.id,
            number=order.number,
            status=order.status,
            total=order.total,
            currency=order.currency,
            created_at=order.created_at,
            items_count=sum(item.quantity for item in order.items),
        )
        for order in orders
    ]
    return PaginatedOrders(items=items, total=total, offset=offset, limit=limit)


@orders_router.get("/{order_id}", response_model=OrderRead)
def order_detail(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Order:
    return commerce_service.get_order(db, user, order_id)


@orders_router.post("/{order_id}/cancel", response_model=OrderRead)
def cancel_order(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Order:
    order = commerce_service.get_order(db, user, order_id)
    return commerce_service.cancel_order(db, user, order)


@orders_router.post("/{order_id}/reorder", response_model=CartRead)
def reorder(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    x_guest_id: str | None = Header(default=None, alias=GUEST_HEADER),
) -> CartRead:
    order = commerce_service.get_order(db, user, order_id)
    cart = _get_cart(db, user, x_guest_id)
    return _cart_response(commerce_service.reorder(db, user, order, cart))


@orders_router.post("/quick-order", response_model=QuickOrderResponse)
def quick_order(
    data: QuickOrderRequest,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
) -> QuickOrderResponse:
    order = commerce_service.create_quick_order(db, data, user)
    return QuickOrderResponse(
        order_id=order.id,
        order_number=order.number,
        total=order.total,
        currency=order.currency,
        message="Заказ успешно оформлен! Наш консьерж свяжется с вами в течение 10 минут для подтверждения доставки.",
    )
