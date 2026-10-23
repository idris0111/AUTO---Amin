import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.catalog import Product
from app.models.commerce import Order, OrderItem, OrderStatus
from app.models.social import Favorite, Review, ReviewStatus
from app.models.user import User
from app.schemas.social import ReviewCreate


def toggle_favorite(db: Session, user: User, product_id: uuid.UUID) -> bool:
    if db.get(Product, product_id) is None:
        raise HTTPException(status_code=404, detail="Product not found")
    existing = db.scalar(
        select(Favorite).where(Favorite.user_id == user.id, Favorite.product_id == product_id)
    )
    if existing:
        db.delete(existing)
        db.commit()
        return False
    db.add(Favorite(user_id=user.id, product_id=product_id))
    db.commit()
    return True


def list_favorites(db: Session, user: User) -> list[Product]:
    rows = db.scalars(
        select(Product)
        .join(Favorite, Favorite.product_id == Product.id)
        .where(Favorite.user_id == user.id)
        .options(
            selectinload(Product.brand),
            selectinload(Product.category),
            selectinload(Product.images),
        )
        .order_by(Favorite.created_at.desc())
    )
    return list(rows)


def _has_completed_purchase(db: Session, user: User, product_id: uuid.UUID) -> bool:
    row = db.scalar(
        select(OrderItem.id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(
            Order.user_id == user.id,
            OrderItem.product_id == product_id,
            Order.status.in_(
                [OrderStatus.DELIVERED, OrderStatus.COMPLETED, OrderStatus.PROCESSING, OrderStatus.SHIPPED]
            ),
        )
        .limit(1)
    )
    return row is not None


def create_review(db: Session, user: User, product_id: uuid.UUID, data: ReviewCreate) -> Review:
    if db.get(Product, product_id) is None:
        raise HTTPException(status_code=404, detail="Product not found")
    existing = db.scalar(
        select(Review).where(Review.user_id == user.id, Review.product_id == product_id)
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already reviewed this product")
    review = Review(
        user_id=user.id,
        product_id=product_id,
        rating=data.rating,
        text=data.text,
        status=ReviewStatus.APPROVED if _has_completed_purchase(db, user, product_id) else ReviewStatus.PENDING,
        is_verified_purchase=_has_completed_purchase(db, user, product_id),
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    _recalculate_rating(db, product_id)
    return review


def list_reviews(db: Session, product_id: uuid.UUID) -> list[Review]:
    return list(
        db.scalars(
            select(Review)
            .options(selectinload(Review.user))
            .where(Review.product_id == product_id, Review.status == ReviewStatus.APPROVED)
            .order_by(Review.created_at.desc())
        )
    )


def _recalculate_rating(db: Session, product_id: uuid.UUID) -> None:
    avg, count = db.execute(
        select(func.avg(Review.rating), func.count(Review.id)).where(
            Review.product_id == product_id, Review.status == ReviewStatus.APPROVED
        )
    ).one()
    product = db.get(Product, product_id)
    if product:
        product.rating_avg = Decimal(str(round(float(avg), 2))) if avg is not None else Decimal("0")
        product.rating_count = int(count or 0)
        db.commit()
