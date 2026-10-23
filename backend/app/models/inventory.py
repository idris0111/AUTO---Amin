"""Inventory: warehouses, per-warehouse stock and an append-only movement ledger.

``Product.stock_quantity`` remains the total sellable quantity used by the catalog,
cart and checkout. It is maintained exclusively by ``app.services.inventory`` and
always equals the sum of ``WarehouseStock.quantity`` for that product.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.types import UTCDateTime
from app.database import Base


class MovementType(str, enum.Enum):
    INITIAL = "initial"  # opening balance migrated from legacy product.stock_quantity
    RECEIPT = "receipt"  # goods received from a supplier
    SALE = "sale"  # deducted by checkout
    ORDER_RETURN = "order_return"  # returned to stock (order cancelled / customer return)
    ADJUSTMENT = "adjustment"  # stock count correction (+/-)
    WRITE_OFF = "write_off"  # damaged / lost goods
    TRANSFER_OUT = "transfer_out"
    TRANSFER_IN = "transfer_in"


movement_type_enum = Enum(
    MovementType, name="movement_type", native_enum=False, create_constraint=False, length=32
)


class Warehouse(Base):
    __tablename__ = "warehouses"
    __table_args__ = (UniqueConstraint("code", name="uq_warehouse_code"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(32))
    name: Mapped[str] = mapped_column(String(200))
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())


class WarehouseStock(Base):
    __tablename__ = "warehouse_stocks"
    __table_args__ = (
        UniqueConstraint("warehouse_id", "product_id", name="uq_warehouse_stock_product"),
        CheckConstraint("quantity >= 0", name="ck_warehouse_stock_non_negative"),
        Index("ix_warehouse_stocks_product_id", "product_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    warehouse_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("warehouses.id", ondelete="RESTRICT"))
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))
    quantity: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime, server_default=func.now(), onupdate=func.now()
    )

    warehouse: Mapped[Warehouse] = relationship()
    product: Mapped["Product"] = relationship()  # noqa: F821


class StockMovement(Base):
    __tablename__ = "stock_movements"
    __table_args__ = (
        Index("ix_stock_movements_product_id", "product_id"),
        Index("ix_stock_movements_warehouse_id", "warehouse_id"),
        Index("ix_stock_movements_order_id", "order_id"),
        Index("ix_stock_movements_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))
    warehouse_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("warehouses.id", ondelete="RESTRICT"))
    movement_type: Mapped[MovementType] = mapped_column(movement_type_enum)
    quantity_delta: Mapped[int] = mapped_column(Integer)
    balance_after: Mapped[int] = mapped_column(Integer)
    order_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("orders.id", ondelete="SET NULL"), nullable=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())

    warehouse: Mapped[Warehouse] = relationship()
    product: Mapped["Product"] = relationship()  # noqa: F821

