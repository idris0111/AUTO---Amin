"""Create inventory tables (warehouses, warehouse_stocks, stock_movements) and backfill existing stock.

Revision ID: 20261022_0007
Revises: 20261020_0006
"""
import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261022_0007"
down_revision: str | None = "20261020_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "warehouses",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("address", sa.String(length=300), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code", name="uq_warehouse_code"),
    )

    op.create_table(
        "warehouse_stocks",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("warehouse_id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("quantity >= 0", name="ck_warehouse_stock_non_negative"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["warehouse_id"], ["warehouses.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("warehouse_id", "product_id", name="uq_warehouse_stock_product"),
    )
    op.create_index("ix_warehouse_stocks_product_id", "warehouse_stocks", ["product_id"])

    op.create_table(
        "stock_movements",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("warehouse_id", sa.Uuid(), nullable=False),
        sa.Column("movement_type", sa.String(length=32), nullable=False),
        sa.Column("quantity_delta", sa.Integer(), nullable=False),
        sa.Column("balance_after", sa.Integer(), nullable=False),
        sa.Column("order_id", sa.Uuid(), nullable=True),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("reason", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["warehouse_id"], ["warehouses.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_stock_movements_created_at", "stock_movements", ["created_at"])
    op.create_index("ix_stock_movements_order_id", "stock_movements", ["order_id"])
    op.create_index("ix_stock_movements_product_id", "stock_movements", ["product_id"])
    op.create_index("ix_stock_movements_warehouse_id", "stock_movements", ["warehouse_id"])

    # Define table constructs for type-safe bulk insert
    warehouses_table = sa.table(
        "warehouses",
        sa.column("id", sa.Uuid()),
        sa.column("code", sa.String()),
        sa.column("name", sa.String()),
        sa.column("city", sa.String()),
        sa.column("is_active", sa.Boolean()),
        sa.column("is_default", sa.Boolean()),
    )
    stocks_table = sa.table(
        "warehouse_stocks",
        sa.column("id", sa.Uuid()),
        sa.column("warehouse_id", sa.Uuid()),
        sa.column("product_id", sa.Uuid()),
        sa.column("quantity", sa.Integer()),
    )
    movements_table = sa.table(
        "stock_movements",
        sa.column("id", sa.Uuid()),
        sa.column("product_id", sa.Uuid()),
        sa.column("warehouse_id", sa.Uuid()),
        sa.column("movement_type", sa.String()),
        sa.column("quantity_delta", sa.Integer()),
        sa.column("balance_after", sa.Integer()),
        sa.column("reason", sa.String()),
    )

    default_wh_id = uuid.uuid4()
    op.bulk_insert(
        warehouses_table,
        [
            {
                "id": default_wh_id,
                "code": "MAIN",
                "name": "Основной склад",
                "city": "Душанбе",
                "is_active": True,
                "is_default": True,
            }
        ],
    )

    bind = op.get_bind()
    products_table = sa.table(
        "products",
        sa.column("id", sa.Uuid()),
        sa.column("stock_quantity", sa.Integer()),
    )
    rows = bind.execute(sa.select(products_table.c.id, products_table.c.stock_quantity)).fetchall()

    stock_records = []
    movement_records = []
    for prod_id, stock_qty in rows:
        qty = stock_qty or 0
        stock_records.append(
            {
                "id": uuid.uuid4(),
                "warehouse_id": default_wh_id,
                "product_id": prod_id,
                "quantity": qty,
            }
        )
        if qty > 0:
            movement_records.append(
                {
                    "id": uuid.uuid4(),
                    "product_id": prod_id,
                    "warehouse_id": default_wh_id,
                    "movement_type": "initial",
                    "quantity_delta": qty,
                    "balance_after": qty,
                    "reason": "Opening balance migration",
                }
            )

    if stock_records:
        op.bulk_insert(stocks_table, stock_records)
    if movement_records:
        op.bulk_insert(movements_table, movement_records)


def downgrade() -> None:
    op.drop_table("stock_movements")
    op.drop_table("warehouse_stocks")
    op.drop_table("warehouses")

