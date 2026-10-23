import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_permission, Permission
from app.models.social import Review, ReviewStatus
from app.models.user import User
from app.schemas.catalog import ProductListItem
from app.schemas.social import FavoriteToggleResult, ReviewCreate, ReviewRead
from app.services import social as social_service
from app.routers.catalog import _product_list_item

router = APIRouter(tags=["Favorites & Reviews"])


@router.get("/favorites", response_model=list[ProductListItem])
def list_favorites(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[ProductListItem]:
    return [_product_list_item(product) for product in social_service.list_favorites(db, current_user)]


@router.post("/favorites/{product_id}", response_model=FavoriteToggleResult)
def toggle_favorite(
    product_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FavoriteToggleResult:
    is_favorite = social_service.toggle_favorite(db, current_user, product_id)
    return FavoriteToggleResult(product_id=product_id, is_favorite=is_favorite)


@router.get("/products/{product_id}/reviews", response_model=list[ReviewRead])
def list_reviews(product_id: uuid.UUID, db: Session = Depends(get_db)) -> list:
    return social_service.list_reviews(db, product_id)


@router.post(
    "/products/{product_id}/reviews",
    response_model=ReviewRead,
    status_code=status.HTTP_201_CREATED,
)
def create_review(
    product_id: uuid.UUID,
    data: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return social_service.create_review(db, current_user, product_id, data)


@router.get("/admin/reviews")
def admin_list_reviews(
    _: User = Depends(require_permission(Permission.MANAGE_CATALOG)),
    db: Session = Depends(get_db),
    pending_only: bool = False,
) -> list[dict]:
    query = select(Review).order_by(Review.created_at.desc()).limit(200)
    if pending_only:
        query = query.where(Review.status == ReviewStatus.PENDING)
    reviews = list(db.scalars(query))
    return [
        {
            "id": review.id,
            "product_id": review.product_id,
            "rating": review.rating,
            "text": review.text,
            "status": review.status,
            "is_verified_purchase": review.is_verified_purchase,
            "created_at": review.created_at,
        }
        for review in reviews
    ]


@router.patch("/admin/reviews/{review_id}")
def admin_moderate_review(
    review_id: uuid.UUID,
    payload: dict,
    _: User = Depends(require_permission(Permission.MANAGE_CATALOG)),
    db: Session = Depends(get_db),
) -> dict:
    decision = payload.get("status")
    if decision not in {"approved", "rejected"}:
        raise HTTPException(status_code=422, detail="status must be approved or rejected")
    review = db.scalar(select(Review).where(Review.id == review_id))
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")
    review.status = ReviewStatus(decision)
    db.commit()
    social_service._recalculate_rating(db, review.product_id)
    return {"id": review.id, "status": review.status}
