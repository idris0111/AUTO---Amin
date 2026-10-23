"""Create notifications and notification_preferences tables.

Revision ID: 20261022_0009
Revises: 20261022_0008
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261022_0009"
down_revision: str | None = "20261022_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False, server_default="system"),
        sa.Column("channel", sa.String(length=32), nullable=False, server_default="in_app"),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("link", sa.String(length=500), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("data", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notifications_user_id_is_read", "notifications", ["user_id", "is_read"])
    op.create_index("ix_notifications_created_at", "notifications", ["created_at"])

    op.create_table(
        "notification_preferences",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("order_updates_in_app", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("order_updates_email", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("promotions_in_app", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("promotions_email", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("loyalty_in_app", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("loyalty_email", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_notification_preferences_user_id"),
    )


def downgrade() -> None:
    op.drop_table("notification_preferences")
    op.drop_index("ix_notifications_created_at", table_name="notifications")
    op.drop_index("ix_notifications_user_id_is_read", table_name="notifications")
    op.drop_table("notifications")

