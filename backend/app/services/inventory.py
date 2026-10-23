"""Inventory service — the only code allowed to change stock quantities.

Concurrency: every decrement is a single conditional UPDATE
(``SET quantity = quantity - n WHERE quantity >= n``). The database applies it
atomically on both PostgreSQL (row lock) and SQLite (database write lock), so two
concurrent checkouts can never push a warehouse below zero: the loser sees
``rowcount == 0`` and gets HTTP 409. The CHECK constraint on
``warehouse_stocks.quantity`` is a second safety net.

``Product.stock_quantity`` is kept equal to the sum of its warehouse rows by applying
the same delta in the same transaction.
"""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models.catalog import Product
from app.models.commerce import ALLOWED_TRANSITIONS, Order, OrderStatus, OrderStatusHistory
from app.models.inventory import MovementType, StockMovement, Warehouse, WarehouseStock

__all__ = [
    "MovementType",
    "allocate_for_order",
    "change_stock",
    "expire_unpaid_orders",
    "get_default_warehouse",
    "restock_order",
    "set_total_stock",
    "transfer",
]

DEFAULT_WAREHOUSE_CODE = "MAIN"
UNPAID_ORDER_TTL_MINUTES = 30


def get_default_warehouse(db: Session) -> Warehouse:
    warehouse = db.scalar(
        select(Warehouse)
        .where(Warehouse.is_active.is_(True))
        .order_by(Warehouse.is_default.desc(), Warehouse.created_at)
        .limit(1)
    )
    if warehouse is None:
        # First run (fresh database / tests): create the main warehouse once.
        warehouse = Warehouse(
            code=DEFAULT_WAREHOUSE_CODE, name="Основной склад", city="Душанбе", is_default=True
        )
        db.add(warehouse)
        db.flush()
    return warehouse


def _get_active_warehouse(db: Session, warehouse_id: uuid.UUID | None) -> Warehouse:
    if warehouse_id is None:
        return get_default_warehouse(db)
    warehouse = db.get(Warehouse, warehouse_id)
    if warehouse is None:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    if not warehouse.is_active:
        raise HTTPException(status_code=400, detail="Warehouse is inactive")
    return warehouse


def _bootstrap_product(db: Session, product_id: uuid.UUID) -> None:
    """Move a legacy ``product.stock_quantity`` into the default warehouse once.

    Products created before the inventory module (or by the seed script) have a total
    but no warehouse rows. The first inventory operation records that balance as an
    INITIAL movement so the ledger stays complete.
    """
    has_rows = db.scalar(
        select(func.count(WarehouseStock.id)).where(WarehouseStock.product_id == product_id)
    )
    if has_rows:
        return
    total = db.scalar(select(Product.stock_quantity).where(Product.id == product_id))
    if total is None:
        raise HTTPException(status_code=404, detail="Product not found")
    warehouse = get_default_warehouse(db)
    db.add(WarehouseStock(warehouse_id=warehouse.id, product_id=product_id, quantity=total))
    if total:
        db.add(
            StockMovement(
                product_id=product_id,
                warehouse_id=warehouse.id,
                movement_type=MovementType.INITIAL,
                quantity_delta=total,
                balance_after=total,
                reason="Opening balance",
            )
        )
    db.flush()


def _stock_row(db: Session, warehouse_id: uuid.UUID, product_id: uuid.UUID) -> WarehouseStock:
    row = db.scalar(
        select(WarehouseStock).where(
            WarehouseStock.warehouse_id == warehouse_id, WarehouseStock.product_id == product_id
        )
    )
    if row is None:
        row = WarehouseStock(warehouse_id=warehouse_id, product_id=product_id, quantity=0)
        db.add(row)
        db.flush()
    return row


def change_stock(
    db: Session,
    *,
    product_id: uuid.UUID,
    delta: int,
    movement_type: MovementType,
    warehouse_id: uuid.UUID | None = None,
    order_id: uuid.UUID | None = None,
    user_id: uuid.UUID | None = None,
    reason: str | None = None,
) -> StockMovement:
    """Apply ``delta`` to one warehouse and the product total, and log the movement.

    Does not commit: callers own the transaction boundary.
    """
    if delta == 0:
        raise HTTPException(status_code=400, detail="Quantity change must not be zero")
    _bootstrap_product(db, product_id)
    warehouse = _get_active_warehouse(db, warehouse_id)
    row = _stock_row(db, warehouse.id, product_id)

    stock_update = (
        update(WarehouseStock)
        .where(WarehouseStock.id == row.id)
        .values(quantity=WarehouseStock.quantity + delta)
        .execution_options(synchronize_session=False)
    )
    if delta < 0:
        stock_update = stock_update.where(WarehouseStock.quantity >= -delta)
    if db.execute(stock_update).rowcount != 1:
        available = db.scalar(select(WarehouseStock.quantity).where(WarehouseStock.id == row.id))
        product_name = db.scalar(select(Product.name).where(Product.id == product_id))
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Not enough stock for {product_name} in {warehouse.name} (available: {available})",
        )
    db.execute(
        update(Product)
        .where(Product.id == product_id)
        .values(stock_quantity=Product.stock_quantity + delta)
        .execution_options(synchronize_session=False)
    )
    balance = db.scalar(select(WarehouseStock.quantity).where(WarehouseStock.id == row.id))
    movement = StockMovement(
        product_id=product_id,
        warehouse_id=warehouse.id,
        movement_type=movement_type,
        quantity_delta=delta,
        balance_after=balance,
        order_id=order_id,
        user_id=user_id,
        reason=reason,
    )
    db.add(movement)
    db.flush()
    # The UPDATEs bypassed the identity map; make loaded objects re-read fresh values.
    for obj in (db.get(Product, product_id), row):
        if obj is not None:
            db.expire(obj)
    return movement


def allocate_for_order(
    db: Session, *, order_id: uuid.UUID, product_id: uuid.UUID, quantity: int, user_id: uuid.UUID
) -> None:
    """Deduct ``quantity`` for an order, default warehouse first, then the fullest ones."""
    _bootstrap_product(db, product_id)
    rows = db.execute(
        select(WarehouseStock.warehouse_id, WarehouseStock.quantity)
        .join(Warehouse, Warehouse.id == WarehouseStock.warehouse_id)
        .where(
            WarehouseStock.product_id == product_id,
            WarehouseStock.quantity > 0,
            Warehouse.is_active.is_(True),
        )
        .order_by(Warehouse.is_default.desc(), WarehouseStock.quantity.desc())
    ).all()
    remaining = quantity
    for warehouse_id, available in rows:
        if remaining == 0:
            break
        take = min(available, remaining)
        change_stock(
            db,
            product_id=product_id,
            delta=-take,
            movement_type=MovementType.SALE,
            warehouse_id=warehouse_id,
            order_id=order_id,
            user_id=user_id,
        )
        remaining -= take
    if remaining:
        product_name = db.scalar(select(Product.name).where(Product.id == product_id))
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Not enough stock for {product_name} (short by {remaining})",
        )


def restock_order(db: Session, order: Order, *, user_id: uuid.UUID | None, reason: str) -> None:
    """Return everything an order took back to the warehouses it came from. Idempotent."""
    already_returned = db.scalar(
        select(func.count(StockMovement.id)).where(
            StockMovement.order_id == order.id,
            StockMovement.movement_type == MovementType.ORDER_RETURN,
        )
    )
    if already_returned:
        return
    sales = list(
        db.scalars(
            select(StockMovement).where(
                StockMovement.order_id == order.id, StockMovement.movement_type == MovementType.SALE
            )
        )
    )
    if sales:
        for sale in sales:
            change_stock(
                db,
                product_id=sale.product_id,
                delta=-sale.quantity_delta,
                movement_type=MovementType.ORDER_RETURN,
                warehouse_id=sale.warehouse_id,
                order_id=order.id,
                user_id=user_id,
                reason=reason,
            )
        return
    # Orders placed before the ledger existed: return to the default warehouse.
    for item in order.items:
        if db.get(Product, item.product_id) is None:
            continue
        change_stock(
            db,
            product_id=item.product_id,
            delta=item.quantity,
            movement_type=MovementType.ORDER_RETURN,
            order_id=order.id,
            user_id=user_id,
            reason=reason,
        )


def set_total_stock(
    db: Session, *, product_id: uuid.UUID, new_total: int, user_id: uuid.UUID | None, reason: str
) -> None:
    """Admin 'set quantity' shortcut: adjusts the default warehouse by the difference."""
    current = db.scalar(select(Product.stock_quantity).where(Product.id == product_id))
    if current is None:
        raise HTTPException(status_code=404, detail="Product not found")
    delta = new_total - current
    if delta:
        change_stock(
            db,
            product_id=product_id,
            delta=delta,
            movement_type=MovementType.ADJUSTMENT,
            user_id=user_id,
            reason=reason,
        )


def transfer(
    db: Session,
    *,
    product_id: uuid.UUID,
    from_warehouse_id: uuid.UUID,
    to_warehouse_id: uuid.UUID,
    quantity: int,
    user_id: uuid.UUID,
    reason: str | None,
) -> None:
    if from_warehouse_id == to_warehouse_id:
        raise HTTPException(status_code=400, detail="Source and destination warehouses must differ")
    change_stock(
        db,
        product_id=product_id,
        delta=-quantity,
        movement_type=MovementType.TRANSFER_OUT,
        warehouse_id=from_warehouse_id,
        user_id=user_id,
        reason=reason,
    )
    change_stock(
        db,
        product_id=product_id,
        delta=quantity,
        movement_type=MovementType.TRANSFER_IN,
        warehouse_id=to_warehouse_id,
        user_id=user_id,
        reason=reason,
    )


def expire_unpaid_orders(db: Session, *, older_than_minutes: int = UNPAID_ORDER_TTL_MINUTES) -> int:
    """Cancel orders stuck in AWAITING_PAYMENT and release their stock reservation."""
    cutoff = datetime.now(UTC) - timedelta(minutes=older_than_minutes)
    orders = list(
        db.scalars(
            select(Order).where(
                Order.status == OrderStatus.AWAITING_PAYMENT, Order.created_at < cutoff
            )
        )
    )
    for order in orders:
        if OrderStatus.CANCELLED not in ALLOWED_TRANSITIONS[order.status]:
            continue
        restock_order(db, order, user_id=None, reason="Payment timeout")
        db.add(
            OrderStatusHistory(
                order_id=order.id,
                from_status=order.status,
                to_status=OrderStatus.CANCELLED,
                note=f"Auto-cancelled: not paid within {older_than_minutes} min",
            )
        )
        order.status = OrderStatus.CANCELLED
    db.commit()
    return len(orders)
