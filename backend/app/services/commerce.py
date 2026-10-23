import secrets
import uuid
from datetime import UTC, datetime
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.catalog import Product, ProductStatus
from app.models.commerce import (
    ALLOWED_TRANSITIONS,
    Cart,
    CartItem,
    Order,
    OrderItem,
    OrderStatus,
    OrderStatusHistory,
    PaymentMethod,
    ShippingMethod,
)
from app.models.user import User
from app.schemas.commerce import CartItemAdd, CheckoutRequest
from app.services import inventory


def get_or_create_cart(db: Session, user: User | None, guest_id: str | None) -> Cart:
    if user is not None:
        cart = db.scalar(
            select(Cart)
            .where(Cart.user_id == user.id)
            .options(selectinload(Cart.items).selectinload(CartItem.product))
        )
        if cart is None:
            cart = Cart(user_id=user.id)
            db.add(cart)
            db.commit()
            db.refresh(cart)
        return cart
    if guest_id:
        cart = db.scalar(
            select(Cart)
            .where(Cart.guest_id == guest_id)
            .options(selectinload(Cart.items).selectinload(CartItem.product))
        )
        if cart is None:
            cart = Cart(guest_id=guest_id)
            db.add(cart)
            db.commit()
            db.refresh(cart)
        return cart
    raise HTTPException(status_code=400, detail="guest_id header required")


def merge_carts(db: Session, guest_cart: Cart, user: User) -> Cart:
    user_cart = get_or_create_cart(db, user, None)
    if guest_cart.id == user_cart.id:
        return user_cart
    for item in list(guest_cart.items):
        existing = db.scalar(
            select(CartItem).where(CartItem.cart_id == user_cart.id, CartItem.product_id == item.product_id)
        )
        if existing:
            existing.quantity += item.quantity
        else:
            item.cart_id = user_cart.id
    db.delete(guest_cart)
    db.commit()
    return get_or_create_cart(db, user, None)


def _load_cart(db: Session, cart: Cart) -> Cart:
    return db.scalar(
        select(Cart)
        .where(Cart.id == cart.id)
        .options(selectinload(Cart.items).selectinload(CartItem.product))
        .execution_options(populate_existing=True)
    )


def add_item(db: Session, cart: Cart, data: CartItemAdd) -> Cart:
    product = db.get(Product, data.product_id)
    if product is None or product.status != ProductStatus.ACTIVE:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.stock_quantity < data.quantity:
        raise HTTPException(status_code=400, detail="Not enough stock")
    cart = _load_cart(db, cart)
    item = next((i for i in cart.items if i.product_id == data.product_id), None)
    if item:
        new_qty = item.quantity + data.quantity
        if new_qty > product.stock_quantity:
            raise HTTPException(status_code=400, detail="Not enough stock")
        item.quantity = new_qty
    else:
        cart.items.append(
            CartItem(product_id=product.id, quantity=data.quantity, unit_price=product.price)
        )
    db.commit()
    return _load_cart(db, cart)


def update_item(db: Session, cart: Cart, item_id: uuid.UUID, quantity: int) -> Cart:
    cart = _load_cart(db, cart)
    item = next((i for i in cart.items if i.id == item_id), None)
    if item is None:
        raise HTTPException(status_code=404, detail="Cart item not found")
    if quantity <= 0:
        db.delete(item)
    else:
        if item.product.stock_quantity < quantity:
            raise HTTPException(status_code=400, detail="Not enough stock")
        item.quantity = quantity
    db.commit()
    return _load_cart(db, cart)


def remove_item(db: Session, cart: Cart, item_id: uuid.UUID) -> Cart:
    cart = _load_cart(db, cart)
    item = next((i for i in cart.items if i.id == item_id), None)
    if item is None:
        raise HTTPException(status_code=404, detail="Cart item not found")
    db.delete(item)
    db.commit()
    return _load_cart(db, cart)


def cart_totals(cart: Cart) -> dict:
    subtotal = sum((i.unit_price * i.quantity for i in cart.items), Decimal("0"))
    return {"subtotal": subtotal, "count": sum(i.quantity for i in cart.items)}


def create_order(db: Session, user: User, cart: Cart, data: CheckoutRequest) -> Order:
    cart = _load_cart(db, cart)
    if not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    product_ids = [item.product_id for item in cart.items]
    # Re-read prices/status from the database; the cart's stored unit_price is never trusted.
    products = {
        p.id: p
        for p in db.scalars(
            select(Product).where(Product.id.in_(product_ids)).execution_options(populate_existing=True)
        ).all()
    }

    for item in cart.items:
        prod = products.get(item.product_id)
        if prod is None or prod.status != ProductStatus.ACTIVE:
            raise HTTPException(
                status_code=400,
                detail=f"Product {prod.name if prod else item.product.name} is unavailable",
            )
        if prod.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=409,
                detail=f"Not enough stock for {prod.name} (available: {prod.stock_quantity})",
            )
        item.unit_price = prod.price

    subtotal = sum((item.unit_price * item.quantity for item in cart.items), Decimal("0"))
    if data.shipping_method == "pickup":
        shipping_cost = Decimal("0")
    else:
        from app.services.shipping import courier_fee

        shipping_cost = courier_fee(db, data.shipping_city, subtotal)
    discount = Decimal("0")
    coupon_code = None
    if data.coupon_code and data.coupon_code.strip():
        from app.services.coupons import apply_coupon

        coupon, discount = apply_coupon(db, data.coupon_code, subtotal)
        coupon_code = coupon.code

    points_redeemed = 0
    points_discount = Decimal("0.00")
    if getattr(data, "points_to_redeem", 0) > 0:
        from app.services import loyalty as loyalty_service

        account = loyalty_service.get_or_create_account(db, user.id)
        max_allowed = loyalty_service.calculate_max_points_for_order(account, subtotal)
        if data.points_to_redeem > max_allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Нельзя списать более {max_allowed} бонусов (макс. 30% от суммы или ваш баланс)",
            )
        points_redeemed = data.points_to_redeem
        points_discount = Decimal(points_redeemed).quantize(Decimal("0.01"))

    order = Order(
        number=_next_order_number(db),
        user_id=user.id,
        status=OrderStatus.PENDING if data.payment_method == "cash_on_delivery" else OrderStatus.AWAITING_PAYMENT,
        shipping_method=data.shipping_method,
        payment_method=data.payment_method,
        subtotal=subtotal,
        shipping_cost=shipping_cost,
        discount=discount,
        coupon_code=coupon_code,
        points_redeemed=points_redeemed,
        points_discount=points_discount,
        total=max(Decimal("0.00"), subtotal + shipping_cost - discount - points_discount),
        contact_name=data.contact_name,
        contact_phone=data.contact_phone,
        contact_email=data.contact_email or user.email,
        shipping_city=data.shipping_city,
        shipping_street=data.shipping_street,
        shipping_postal_code=data.shipping_postal_code,
        customer_note=data.customer_note,
    )
    # Everything that writes happens inside a SAVEPOINT: if any stock allocation or the
    # coupon limit check fails, the order, its items and earlier deductions are undone.
    with db.begin_nested():
        db.add(order)
        db.flush()
        for item in cart.items:
            prod = products[item.product_id]
            db.add(
                OrderItem(
                    order_id=order.id,
                    product_id=prod.id,
                    product_name=prod.name,
                    product_sku=prod.sku,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    line_total=item.unit_price * item.quantity,
                )
            )
            # Atomic, race-safe deduction; raises 409 on conflict.
            inventory.allocate_for_order(
                db, order_id=order.id, product_id=prod.id, quantity=item.quantity, user_id=user.id
            )
        db.add(
            OrderStatusHistory(order_id=order.id, from_status=None, to_status=order.status, changed_by=user.id)
        )
        if coupon_code:
            from app.services.coupons import consume_coupon

            consume_coupon(db, coupon_code)
        if points_redeemed > 0:
            from app.services import loyalty as loyalty_service

            loyalty_service.redeem_points_for_order(
                db, account, points_redeemed, subtotal, order.id
            )
    db.delete(cart)
    db.commit()
    try:
        from app.services import notifications as notifications_service

        notifications_service.notify_order_created(db, order)
    except Exception:
        pass
    return get_order(db, user, order.id)


def _next_order_number(db: Session) -> str:
    day = datetime.now(UTC).strftime("%Y%m%d")
    for _ in range(8):
        candidate = f"AU-{day}-{secrets.token_hex(3).upper()}"
        if db.scalar(select(Order.id).where(Order.number == candidate)) is None:
            return candidate
    raise HTTPException(status_code=503, detail="Could not allocate an order number, try again")


ORDER_LOADS = (
    selectinload(Order.items),
    selectinload(Order.status_history),
)


def get_order(db: Session, user: User, order_id: uuid.UUID) -> Order:
    order = db.scalar(
        select(Order).options(*ORDER_LOADS).where(Order.id == order_id, Order.user_id == user.id)
    )
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


def list_orders(db: Session, user: User, offset: int = 0, limit: int = 20) -> tuple[list[Order], int]:
    total = db.scalar(select(func.count(Order.id)).where(Order.user_id == user.id)) or 0
    orders = list(
        db.scalars(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.user_id == user.id)
            .order_by(Order.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
    )
    return orders, total


def cancel_order(db: Session, user: User, order: Order) -> Order:
    if OrderStatus.CANCELLED not in ALLOWED_TRANSITIONS[order.status]:
        raise HTTPException(status_code=400, detail="Order cannot be cancelled in its current status")
    inventory.restock_order(db, order, user_id=user.id, reason="Cancelled by customer")
    from app.services import loyalty as loyalty_service

    loyalty_service.refund_points_for_order(db, order)
    db.add(
        OrderStatusHistory(
            order_id=order.id, from_status=order.status, to_status=OrderStatus.CANCELLED, changed_by=user.id
        )
    )
    old_status = order.status
    order.status = OrderStatus.CANCELLED
    db.commit()
    try:
        from app.services import notifications as notifications_service

        notifications_service.notify_order_status_changed(
            db, order, old_status, OrderStatus.CANCELLED, "Отменено покупателем"
        )
    except Exception:
        pass
    return get_order(db, user, order.id)


def reorder(db: Session, user: User, order: Order, cart: Cart) -> Cart:
    cart = _load_cart(db, cart)
    for item in order.items:
        product = db.get(Product, item.product_id)
        if product is None or product.status != ProductStatus.ACTIVE:
            continue
        existing = next((i for i in cart.items if i.product_id == product.id), None)
        if existing:
            existing.quantity += item.quantity
        else:
            cart.items.append(
                CartItem(product_id=product.id, quantity=item.quantity, unit_price=product.price)
            )
    db.commit()
    return _load_cart(db, cart)


def create_quick_order(db: Session, data, user: User | None = None) -> Order:
    from app.models.user import UserRole
    from app.core.security import hash_password

    prod = db.scalar(
        select(Product)
        .where(Product.id == data.product_id)
        .execution_options(populate_existing=True)
    )
    if prod is None or prod.status != ProductStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Товар не найден или недоступен для заказа")
    if prod.stock_quantity < data.quantity:
        raise HTTPException(
            status_code=409,
            detail=f"Недостаточно товара на складе (доступно: {prod.stock_quantity})"
        )

    # Link to existing user or create guest user
    if user is None:
        clean_phone = ''.join(ch for ch in data.customer_phone if ch.isdigit() or ch == '+')
        guest_email = f"guest_{clean_phone.replace('+', '')}@autouniverse.tj"
        user = db.scalar(select(User).where(User.email == guest_email))
        if user is None:
            user = User(
                email=guest_email,
                first_name=data.customer_name,
                last_name="Покупатель",
                phone=data.customer_phone,
                password_hash=hash_password(uuid.uuid4().hex),
                role=UserRole.CUSTOMER,
            )
            db.add(user)
            db.flush()

    subtotal = prod.price * data.quantity
    shipping_cost = Decimal("0.00")
    total = subtotal

    note_parts = [f"Быстрый заказ в 1 клик. Способ связи: {data.contact_method}."]
    if data.comment:
        note_parts.append(f"Комментарий: {data.comment}")
    note = " ".join(note_parts)

    order = Order(
        number=_next_order_number(db),
        user_id=user.id,
        status=OrderStatus.PENDING,
        shipping_method=ShippingMethod.COURIER,
        payment_method=PaymentMethod.CASH_ON_DELIVERY,
        subtotal=subtotal,
        shipping_cost=shipping_cost,
        discount=Decimal("0.00"),
        total=total,
        contact_name=data.customer_name,
        contact_phone=data.customer_phone,
        contact_email=user.email,
        shipping_city="Душанбе",
        shipping_street="Уточнить у клиента",
        customer_note=note,
    )

    with db.begin_nested():
        db.add(order)
        db.flush()
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=prod.id,
                product_name=prod.name,
                product_sku=prod.sku,
                quantity=data.quantity,
                unit_price=prod.price,
                line_total=subtotal,
            )
        )
        db.flush()
        db.add(
            OrderStatusHistory(
                order_id=order.id,
                from_status=None,
                to_status=order.status,
                changed_by=user.id,
            )
        )
        inventory.allocate_for_order(
            db, order_id=order.id, product_id=prod.id, quantity=data.quantity, user_id=user.id
        )

    db.commit()
    db.refresh(order)
    return order
