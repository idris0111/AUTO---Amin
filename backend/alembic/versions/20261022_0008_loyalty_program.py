"""Create loyalty accounts, transactions tables and order points columns.

Revision ID: 20261022_0008
Revises: 20261022_0007
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261022_0008"
down_revision: str | None = "20261022_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Orders loyalty columns
    op.add_column("orders", sa.Column("points_redeemed", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("orders", sa.Column("points_discount", sa.Numeric(12, 2), nullable=False, server_default="0"))

    # 2. Loyalty Accounts table
    op.create_table(
        "loyalty_accounts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("points_balance", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("lifetime_points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_spent", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("tier", sa.String(length=32), nullable=False, server_default="silver"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_loyalty_account_user"),
        sa.CheckConstraint("points_balance >= 0", name="chk_loyalty_balance_non_negative"),
    )
    op.create_index("ix_loyalty_accounts_user_id", "loyalty_accounts", ["user_id"], unique=True)

    # 3. Loyalty Transactions table
    op.create_table(
        "loyalty_transactions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("account_id", sa.Uuid(), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("balance_after", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("order_id", sa.Uuid(), nullable=True),
        sa.Column("description", sa.String(length=300), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["loyalty_accounts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_loyalty_tx_account_id", "loyalty_transactions", ["account_id"])
    op.create_index("ix_loyalty_tx_order_id", "loyalty_transactions", ["order_id"])
    op.create_index("ix_loyalty_tx_created_at", "loyalty_transactions", ["created_at"])


def downgrade() -> None:
    op.drop_table("loyalty_transactions")
    op.drop_table("loyalty_accounts")
    op.drop_column("orders", "points_discount")
    op.drop_column("orders", "points_redeemed")

