import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.types import UTCDateTime
from app.database import Base


class LoyaltyTier(str, enum.Enum):
    SILVER = "silver"      # 3% cashback (0 - 2,999 TJS)
    GOLD = "gold"          # 5% cashback (3,000 - 9,999 TJS)
    PLATINUM = "platinum"  # 7% cashback (10,000+ TJS)


class LoyaltyTransactionType(str, enum.Enum):
    WELCOME = "welcome"
    ACCRUAL = "accrual"
    REDEMPTION = "redemption"
    REFUND = "refund"
    ADMIN_ADJUST = "admin_adjust"


loyalty_tier_enum = Enum(LoyaltyTier, name="loyalty_tier", native_enum=False, create_constraint=False)
loyalty_tx_type_enum = Enum(LoyaltyTransactionType, name="loyalty_tx_type", native_enum=False, create_constraint=False)


# Thresholds in TJS to reach each tier
TIER_THRESHOLDS = {
    LoyaltyTier.SILVER: Decimal("0.00"),
    LoyaltyTier.GOLD: Decimal("3000.00"),
    LoyaltyTier.PLATINUM: Decimal("10000.00"),
}

# Cashback percentage per tier
TIER_CASHBACK_RATES = {
    LoyaltyTier.SILVER: Decimal("0.03"),
    LoyaltyTier.GOLD: Decimal("0.05"),
    LoyaltyTier.PLATINUM: Decimal("0.07"),
}


class LoyaltyAccount(Base):
    __tablename__ = "loyalty_accounts"
    __table_args__ = (
        Index("ix_loyalty_accounts_user_id", "user_id", unique=True),
        CheckConstraint("points_balance >= 0", name="chk_loyalty_balance_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    points_balance: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    lifetime_points: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    total_spent: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), server_default=text("0.00"))
    tier: Mapped[LoyaltyTier] = mapped_column(loyalty_tier_enum, default=LoyaltyTier.SILVER, server_default=text("'silver'"))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship()  # noqa: F821
    transactions: Mapped[list["LoyaltyTransaction"]] = relationship(
        back_populates="account", cascade="all, delete-orphan", order_by="desc(LoyaltyTransaction.created_at)"
    )


class LoyaltyTransaction(Base):
    __tablename__ = "loyalty_transactions"
    __table_args__ = (
        Index("ix_loyalty_tx_account_id", "account_id"),
        Index("ix_loyalty_tx_order_id", "order_id"),
        Index("ix_loyalty_tx_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("loyalty_accounts.id", ondelete="CASCADE"))
    amount: Mapped[int] = mapped_column(Integer)
    balance_after: Mapped[int] = mapped_column(Integer)
    type: Mapped[LoyaltyTransactionType] = mapped_column(loyalty_tx_type_enum)
    order_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    description: Mapped[str] = mapped_column(String(300))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())

    account: Mapped[LoyaltyAccount] = relationship(back_populates="transactions")

