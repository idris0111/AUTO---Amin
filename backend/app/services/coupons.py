import uuid
from datetime import UTC, datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session

from app.models.coupon import Coupon, CouponType
from app.schemas.coupon import CouponCreate, CouponUpdate


def _find_active_coupon(db: Session, code: str) -> Coupon:
    coupon = db.scalar(select(Coupon).where(Coupon.code == code.strip().upper()))
    now = datetime.now(UTC)
    if coupon is None or not coupon.is_active:
        raise HTTPException(status_code=404, detail="Промокод не найден или неактивен")
    if coupon.starts_at and coupon.starts_at > now:
        raise HTTPException(status_code=400, detail="Промокод ещё не активен")
    if coupon.expires_at and coupon.expires_at < now:
        raise HTTPException(status_code=400, detail="Срок действия промокода истёк")
    if coupon.max_uses is not None and coupon.used_count >= coupon.max_uses:
        raise HTTPException(status_code=400, detail="Лимит использований промокода исчерпан")
    return coupon


def compute_discount(coupon: Coupon, subtotal: Decimal) -> Decimal:
    if subtotal < coupon.min_order_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Минимальная сумма заказа для промокода — {coupon.min_order_amount} TJS",
        )
    if coupon.type == CouponType.PERCENT:
        discount = (subtotal * coupon.value / Decimal("100")).quantize(Decimal("0.01"))
    else:
        discount = min(coupon.value, subtotal)
    return discount


def validate_coupon(db: Session, code: str, subtotal: Decimal) -> Decimal:
    return compute_discount(_find_active_coupon(db, code), subtotal)


def apply_coupon(db: Session, code: str, subtotal: Decimal) -> tuple[Coupon, Decimal]:
    coupon = _find_active_coupon(db, code)
    return coupon, compute_discount(coupon, subtotal)


def consume_coupon(db: Session, code: str) -> None:
    """Atomically count one use; fails if a concurrent checkout took the last use."""
    statement = (
        update(Coupon)
        .where(Coupon.code == code)
        .where(or_(Coupon.max_uses.is_(None), Coupon.used_count < Coupon.max_uses))
        .values(used_count=Coupon.used_count + 1)
        .execution_options(synchronize_session=False)
    )
    if db.execute(statement).rowcount != 1:
        raise HTTPException(status_code=400, detail="Лимит использований промокода исчерпан")


def list_coupons(db: Session) -> list[Coupon]:
    return list(db.scalars(select(Coupon).order_by(Coupon.created_at.desc())))


def create_coupon(db: Session, data: CouponCreate) -> Coupon:
    code = data.code.strip().upper()
    if db.scalar(select(Coupon.id).where(Coupon.code == code)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Промокод уже существует")
    coupon = Coupon(code=code, **data.model_dump(exclude={"code"}))
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon


def update_coupon(db: Session, coupon_id: uuid.UUID, data: CouponUpdate) -> Coupon:
    coupon = db.get(Coupon, coupon_id)
    if coupon is None:
        raise HTTPException(status_code=404, detail="Coupon not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(coupon, key, value)
    db.commit()
    db.refresh(coupon)
    return coupon


def delete_coupon(db: Session, coupon_id: uuid.UUID) -> None:
    coupon = db.get(Coupon, coupon_id)
    if coupon is None:
        raise HTTPException(status_code=404, detail="Coupon not found")
    db.delete(coupon)
    db.commit()
