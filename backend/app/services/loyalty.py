import uuid
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.commerce import Order
from app.models.loyalty import (
    TIER_CASHBACK_RATES,
    TIER_THRESHOLDS,
    LoyaltyAccount,
    LoyaltyTier,
    LoyaltyTransaction,
    LoyaltyTransactionType,
)
from app.schemas.loyalty import LoyaltyAccountRead, LoyaltyTierInfo, LoyaltyTransactionRead

MAX_POINTS_DISCOUNT_PERCENT = Decimal("0.30")  # Max 30% of subtotal can be paid with points
WELCOME_BONUS_POINTS = 100  # 100 TJS bonus for registration


def compute_tier(total_spent: Decimal) -> LoyaltyTier:
    """Calculate loyalty tier based on cumulative spent amount in TJS."""
    if total_spent >= TIER_THRESHOLDS[LoyaltyTier.PLATINUM]:
        return LoyaltyTier.PLATINUM
    if total_spent >= TIER_THRESHOLDS[LoyaltyTier.GOLD]:
        return LoyaltyTier.GOLD
    return LoyaltyTier.SILVER


def get_tier_info(account: LoyaltyAccount) -> LoyaltyTierInfo:
    """Detailed tier progress, cashback percentage, and spending needed for upgrade."""
    current_tier = account.tier
    rate = TIER_CASHBACK_RATES[current_tier]
    cashback_percent = int(rate * 100)

    next_tier: Optional[LoyaltyTier] = None
    spent_needed: Optional[Decimal] = None
    progress_percent: int = 100

    if current_tier == LoyaltyTier.SILVER:
        next_tier = LoyaltyTier.GOLD
        target = TIER_THRESHOLDS[LoyaltyTier.GOLD]
        needed = target - account.total_spent
        spent_needed = max(needed, Decimal("0.00"))
        progress_percent = min(int((account.total_spent / target) * 100), 99)
    elif current_tier == LoyaltyTier.GOLD:
        next_tier = LoyaltyTier.PLATINUM
        target = TIER_THRESHOLDS[LoyaltyTier.PLATINUM]
        range_span = target - TIER_THRESHOLDS[LoyaltyTier.GOLD]
        current_span = account.total_spent - TIER_THRESHOLDS[LoyaltyTier.GOLD]
        needed = target - account.total_spent
        spent_needed = max(needed, Decimal("0.00"))
        progress_percent = min(int((current_span / range_span) * 100), 99)

    return LoyaltyTierInfo(
        current_tier=current_tier,
        cashback_rate=rate,
        cashback_percent=cashback_percent,
        next_tier=next_tier,
        spent_current=account.total_spent,
        spent_needed_for_next=spent_needed,
        tier_progress_percent=progress_percent,
    )


def get_or_create_account(db: Session, user_id: uuid.UUID) -> LoyaltyAccount:
    """Fetch user's loyalty account or create an active one with a welcome bonus."""
    account = db.scalar(
        select(LoyaltyAccount)
        .options(selectinload(LoyaltyAccount.transactions))
        .where(LoyaltyAccount.user_id == user_id)
    )
    if account is None:
        account = LoyaltyAccount(
            user_id=user_id,
            points_balance=WELCOME_BONUS_POINTS,
            lifetime_points=WELCOME_BONUS_POINTS,
            total_spent=Decimal("0.00"),
            tier=LoyaltyTier.SILVER,
        )
        db.add(account)
        db.flush()

        # Add initial welcome transaction
        welcome_tx = LoyaltyTransaction(
            account_id=account.id,
            amount=WELCOME_BONUS_POINTS,
            balance_after=WELCOME_BONUS_POINTS,
            type=LoyaltyTransactionType.WELCOME,
            description="Приветственный бонус за регистрацию в AUTO UNIVERSE",
        )
        db.add(welcome_tx)
        db.commit()

        # Reload with transactions
        account = db.scalar(
            select(LoyaltyAccount)
            .options(selectinload(LoyaltyAccount.transactions))
            .where(LoyaltyAccount.id == account.id)
        )
    return account


def get_account_profile(db: Session, user_id: uuid.UUID) -> LoyaltyAccountRead:
    """Full account read model with tier details and recent 20 transactions."""
    account = get_or_create_account(db, user_id)
    tier_info = get_tier_info(account)

    txs = sorted(account.transactions, key=lambda t: t.created_at, reverse=True)[:20]
    return LoyaltyAccountRead(
        points_balance=account.points_balance,
        lifetime_points=account.lifetime_points,
        total_spent=account.total_spent,
        tier_info=tier_info,
        recent_transactions=[LoyaltyTransactionRead.model_validate(t) for t in txs],
    )


def calculate_max_points_for_order(account: LoyaltyAccount, subtotal: Decimal) -> int:
    """Calculate the maximum points a user is allowed to spend on an order."""
    max_discount_tjs = int(subtotal * MAX_POINTS_DISCOUNT_PERCENT)
    return max(0, min(account.points_balance, max_discount_tjs))


def redeem_points_for_order(
    db: Session,
    account: LoyaltyAccount,
    points_to_redeem: int,
    subtotal: Decimal,
    order_id: uuid.UUID,
) -> tuple[int, Decimal]:
    """Atomically redeem points for an order. Returns (points_used, discount_tjs)."""
    if points_to_redeem <= 0:
        return 0, Decimal("0.00")

    max_allowed = calculate_max_points_for_order(account, subtotal)
    if points_to_redeem > max_allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Нельзя списать более {max_allowed} бонусов (макс. 30% от суммы заказа или текущий баланс)",
        )

    account.points_balance -= points_to_redeem
    discount_tjs = Decimal(points_to_redeem)

    tx = LoyaltyTransaction(
        account_id=account.id,
        amount=-points_to_redeem,
        balance_after=account.points_balance,
        type=LoyaltyTransactionType.REDEMPTION,
        order_id=order_id,
        description=f"Оплата заказа бонусами",
    )
    db.add(tx)
    return points_to_redeem, discount_tjs


def accrue_points_for_order(db: Session, order: Order) -> int:
    """Accrue cashback points when an order is completed/delivered (idempotent)."""
    # Check if already accrued for this order
    existing_accrual = db.scalar(
        select(LoyaltyTransaction).where(
            LoyaltyTransaction.order_id == order.id,
            LoyaltyTransaction.type == LoyaltyTransactionType.ACCRUAL,
        )
    )
    if existing_accrual is not None:
        return 0

    account = get_or_create_account(db, order.user_id)
    account.total_spent += order.total

    # Update tier if qualified
    new_tier = compute_tier(account.total_spent)
    account.tier = new_tier

    # Calculate cashback
    cashback_rate = TIER_CASHBACK_RATES[new_tier]
    points_earned = int(round(order.total * cashback_rate, 0))
    if points_earned < 1 and order.total > 0:
        points_earned = 1

    account.points_balance += points_earned
    account.lifetime_points += points_earned

    tx = LoyaltyTransaction(
        account_id=account.id,
        amount=points_earned,
        balance_after=account.points_balance,
        type=LoyaltyTransactionType.ACCRUAL,
        order_id=order.id,
        description=f"Кэшбэк {int(cashback_rate * 100)}% за выполненный заказ {order.number}",
    )
    db.add(tx)
    try:
        from app.services import notifications as notifications_service

        notifications_service.notify_loyalty_points(
            db, order.user_id, points_earned, account.points_balance, tx.description
        )
    except Exception:
        pass
    return points_earned


def refund_points_for_order(db: Session, order: Order) -> int:
    """Refund redeemed points if an order is cancelled (idempotent)."""
    if order.points_redeemed <= 0:
        return 0

    # Check if already refunded
    existing_refund = db.scalar(
        select(LoyaltyTransaction).where(
            LoyaltyTransaction.order_id == order.id,
            LoyaltyTransaction.type == LoyaltyTransactionType.REFUND,
        )
    )
    if existing_refund is not None:
        return 0

    account = get_or_create_account(db, order.user_id)
    account.points_balance += order.points_redeemed

    tx = LoyaltyTransaction(
        account_id=account.id,
        amount=order.points_redeemed,
        balance_after=account.points_balance,
        type=LoyaltyTransactionType.REFUND,
        order_id=order.id,
        description=f"Возврат {order.points_redeemed} бонусов за отмененный заказ {order.number}",
    )
    db.add(tx)
    return order.points_redeemed


def admin_adjust_points(
    db: Session,
    user_id: uuid.UUID,
    amount: int,
    description: str,
) -> LoyaltyAccount:
    """Manually add or deduct bonus points by administrator."""
    account = get_or_create_account(db, user_id)
    if account.points_balance + amount < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Нельзя списать {abs(amount)} бонусов: на балансе всего {account.points_balance}",
        )

    account.points_balance += amount
    if amount > 0:
        account.lifetime_points += amount

    tx = LoyaltyTransaction(
        account_id=account.id,
        amount=amount,
        balance_after=account.points_balance,
        type=LoyaltyTransactionType.ADMIN_ADJUST,
        description=description,
    )
    db.add(tx)
    db.commit()
    try:
        from app.services import notifications as notifications_service

        notifications_service.notify_loyalty_points(
            db, user_id, amount, account.points_balance, description
        )
    except Exception:
        pass
    return account

