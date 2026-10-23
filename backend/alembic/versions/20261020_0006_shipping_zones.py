"""Create shipping_zones table.

Revision ID: 20261020_0006
Revises: 20261020_0005
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261020_0006"
down_revision: str | None = "20261020_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "shipping_zones",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("city", sa.String(length=100), nullable=False),
        sa.Column("region", sa.String(length=100), nullable=True),
        sa.Column("fee", sa.Numeric(12, 2), nullable=False),
        sa.Column("free_from", sa.Numeric(12, 2), nullable=True),
        sa.Column("eta_days_min", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("eta_days_max", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_shipping_zones_city", "shipping_zones", ["city"], unique=True)


def downgrade() -> None:
    op.drop_table("shipping_zones")
