import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import Permission, require_permission
from app.models.catalog import Product, ProductStatus
from app.models.commerce import ALLOWED_TRANSITIONS, Order, OrderStatus, OrderStatusHistory
from app.models.user import User
from app.services import inventory

LOW_STOCK_THRESHOLD = 5

router = APIRouter(prefix="/admin", tags=["Admin Orders"])


class StatusChange(BaseModel):
    status: OrderStatus
    note: str | None = Field(default=None, max_length=500)


@router.get("/orders")
def list_orders(
    _: User = Depends(require_permission(Permission.VIEW_ORDERS)),
    db: Session = Depends(get_db),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    order_status: OrderStatus | None = None,
) -> dict:
    base = select(Order)
    if order_status is not None:
        base = base.where(Order.status == order_status)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    orders = list(
        db.scalars(
            base.options(selectinload(Order.items)).order_by(Order.created_at.desc()).offset(offset).limit(limit)
        )
    )
    return {
        "items": [
            {
                "id": order.id,
                "number": order.number,
                "status": order.status,
                "allowed_transitions": sorted(s.value for s in ALLOWED_TRANSITIONS[order.status]),
                "total": order.total,
                "currency": order.currency,
                "customer": order.contact_name,
                "contact_name": order.contact_name,
                "contact_phone": order.contact_phone,
                "shipping_city": order.shipping_city,
                "payment_method": order.payment_method,
                "shipping_method": order.shipping_method,
                "created_at": order.created_at,
                "items_count": len(order.items),
            }
            for order in orders
        ],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get("/orders/stats")
def orders_stats(
    _: User = Depends(require_permission(Permission.VIEW_STATISTICS)),
    db: Session = Depends(get_db),
) -> dict:
    total_orders = db.scalar(select(func.count(Order.id))) or 0
    active_filter = Order.status.not_in([OrderStatus.CANCELLED, OrderStatus.RETURNED])
    revenue = (
        db.scalar(select(func.coalesce(func.sum(Order.total), 0)).where(active_filter))
        or Decimal("0")
    )
    active_orders = db.scalar(select(func.count(Order.id)).where(active_filter)) or 0
    avg_check = (revenue / active_orders) if active_orders else Decimal("0")
    pending_orders = db.scalar(select(func.count(Order.id)).where(Order.status == OrderStatus.PENDING)) or 0
    by_status = dict(
        db.execute(
            select(Order.status, func.count(Order.id)).group_by(Order.status)
        ).all()
    )
    low_stock = list(
        db.scalars(
            select(Product)
            .where(Product.stock_quantity <= LOW_STOCK_THRESHOLD, Product.status == ProductStatus.ACTIVE)
            .order_by(Product.stock_quantity)
            .limit(10)
        )
    )
    recent_orders = list(
        db.scalars(
            select(Order)
            .options(selectinload(Order.items), selectinload(Order.status_history))
            .order_by(Order.created_at.desc())
            .limit(5)
        )
    )
    return {
        "orders": total_orders,
        "revenue": revenue,
        "average_order_value": avg_check,
        "pending_orders": pending_orders,
        "currency": "TJS",
        "orders_by_status": {
            status.value if hasattr(status, "value") else str(status): count
            for status, count in by_status.items()
        },
        "low_stock": [
            {
                "id": product.id,
                "name": product.name,
                "sku": product.sku,
                "stock_quantity": product.stock_quantity,
                "low_stock_threshold": LOW_STOCK_THRESHOLD,
            }
            for product in low_stock
        ],
        "recent_orders": [
            {
                "id": order.id,
                "number": order.number,
                "status": order.status.value if hasattr(order.status, "value") else str(order.status),
                "total": order.total,
                "contact_name": order.contact_name,
                "created_at": order.created_at,
            }
            for order in recent_orders
        ],
    }


@router.get("/orders/{order_id}")
def order_detail(
    order_id: uuid.UUID,
    _: User = Depends(require_permission(Permission.VIEW_ORDERS)),
    db: Session = Depends(get_db),
) -> dict:
    order = db.scalar(
        select(Order).options(selectinload(Order.items), selectinload(Order.status_history)).where(Order.id == order_id)
    )
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return {
        "id": order.id,
        "number": order.number,
        "status": order.status,
        "allowed_transitions": sorted(s.value for s in ALLOWED_TRANSITIONS[order.status]),
        "shipping_method": order.shipping_method,
        "payment_method": order.payment_method,
        "subtotal": order.subtotal,
        "shipping_cost": order.shipping_cost,
        "discount": order.discount,
        "points_redeemed": getattr(order, "points_redeemed", 0) or 0,
        "points_discount": getattr(order, "points_discount", Decimal("0")) or Decimal("0"),
        "total": order.total,
        "currency": order.currency,
        "contact_name": order.contact_name,
        "contact_phone": order.contact_phone,
        "contact_email": order.contact_email,
        "shipping_city": order.shipping_city,
        "shipping_street": order.shipping_street,
        "shipping_postal_code": order.shipping_postal_code,
        "customer_note": order.customer_note,
        "created_at": order.created_at,
        "items": [
            {
                "id": item.id,
                "product_id": item.product_id,
                "product_name": item.product_name,
                "product_sku": item.product_sku,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "line_total": item.line_total,
            }
            for item in order.items
        ],
        "status_history": [
            {
                "id": event.id,
                "from_status": event.from_status,
                "to_status": event.to_status,
                "note": event.note,
                "created_at": event.created_at,
            }
            for event in order.status_history
        ],
    }


@router.patch("/orders/{order_id}/status")
def change_status(
    order_id: uuid.UUID,
    payload: StatusChange,
    admin: User = Depends(require_permission(Permission.MANAGE_ORDERS)),
    db: Session = Depends(get_db),
) -> dict:
    target = payload.status
    order = db.scalar(select(Order).options(selectinload(Order.items)).where(Order.id == order_id))
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if target not in ALLOWED_TRANSITIONS[order.status]:
        raise HTTPException(
            status_code=400,
            detail=f"Transition {order.status.value} -> {target.value} is not allowed",
        )
    if target == OrderStatus.CANCELLED:
        # Goods returned to warehouse (idempotent)
        inventory.restock_order(db, order, user_id=admin.id, reason=payload.note or "Cancelled by staff")
        from app.services import loyalty as loyalty_service

        loyalty_service.refund_points_for_order(db, order)
    elif target in (OrderStatus.COMPLETED, OrderStatus.DELIVERED):
        from app.services import loyalty as loyalty_service

        loyalty_service.accrue_points_for_order(db, order)
    old_status = order.status
    db.add(
        OrderStatusHistory(
            order_id=order.id, from_status=order.status, to_status=target, changed_by=admin.id, note=payload.note
        )
    )
    order.status = target
    db.commit()
    try:
        from app.services import notifications as notifications_service

        notifications_service.notify_order_status_changed(
            db, order, old_status, target, payload.note
        )
    except Exception:
        pass
    return {
        "id": order.id,
        "status": order.status,
        "allowed_transitions": sorted(s.value for s in ALLOWED_TRANSITIONS[order.status]),
    }


@router.post("/orders/expire-unpaid")
def expire_unpaid(
    older_than_minutes: int = Query(default=inventory.UNPAID_ORDER_TTL_MINUTES, ge=5, le=60 * 24 * 7),
    _: User = Depends(require_permission(Permission.MANAGE_ORDERS)),
    db: Session = Depends(get_db),
) -> dict:
    """Cancel unpaid orders older than reservation window and release stock."""
    return {"cancelled": inventory.expire_unpaid_orders(db, older_than_minutes=older_than_minutes)}
