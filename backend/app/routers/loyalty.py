import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import Permission, get_current_user, require_permission
from app.models.user import User
from app.schemas.loyalty import (
    AdminAdjustPointsRequest,
    LoyaltyAccountRead,
    PointsApplyRequest,
    PointsApplyResponse,
)
from app.services import loyalty as loyalty_service

router = APIRouter(prefix="/loyalty", tags=["Loyalty & Rewards"])


@router.get("/me", response_model=LoyaltyAccountRead)
def get_my_loyalty_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LoyaltyAccountRead:
    """Return customer's loyalty tier, cashback percentage, points balance, and ledger history."""
    return loyalty_service.get_account_profile(db, current_user.id)


@router.post("/quote-discount", response_model=PointsApplyResponse)
def quote_points_discount(
    data: PointsApplyRequest,
    subtotal: Decimal = Query(ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PointsApplyResponse:
    """Calculate allowable points to redeem against a cart subtotal."""
    account = loyalty_service.get_or_create_account(db, current_user.id)
    max_allowed = loyalty_service.calculate_max_points_for_order(account, subtotal)
    applied = min(data.points, max_allowed)
    return PointsApplyResponse(
        points_applied=applied,
        discount_amount=Decimal(applied),
        remaining_balance=account.points_balance - applied,
        max_allowed_points=max_allowed,
    )


@router.post("/admin/{user_id}/adjust", response_model=LoyaltyAccountRead)
def admin_adjust_user_points(
    user_id: uuid.UUID,
    data: AdminAdjustPointsRequest,
    _: User = Depends(require_permission(Permission.MANAGE_USERS)),
    db: Session = Depends(get_db),
) -> LoyaltyAccountRead:
    """Admin endpoint to grant or deduct bonus points."""
    loyalty_service.admin_adjust_points(db, user_id, data.amount, data.description)
    return loyalty_service.get_account_profile(db, user_id)

